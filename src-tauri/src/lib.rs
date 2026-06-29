// ── 引擎模块（桌面 + Docker 两种外壳共用同一份源码）──
pub mod chat;
pub mod claude_md;
pub mod codex_proxy;
pub mod conv;
pub mod convert;
pub mod doctor;
// forge.rs 保留:仅其通用工具(run_with_timeout / find_chromium / path_to_file_url /
// forge_preflight)被 fable(文件中心首帧)与 server 复用;重型渲染子模块(pptx/video/tts/
// capture/fx)已随媒体工坊一并移除,forge.rs 内对应命令包装函数同步删除。
pub mod forge;
pub mod fable;
pub mod infer;
pub mod kb;
pub mod palette;
pub mod expert;
pub mod provider;
pub mod scan;
// sense.rs 保留:fable(检索枢纽 embed/rerank 服务商解析)与 voice_asr(模型根)强依赖其
// active_provider/effective_key/models_root;故「感官 API 坞」命令面与调度已下线,但模块本体保留。
pub mod sense;
pub mod skills;
pub mod voice;
// 语音识别运行时(本地 SenseVoice via sherpa-rs);默认不编译,保护现有 build。
#[cfg(feature = "voice-asr")]
pub mod voice_asr;
// 实时语音输入(录音+全局热键+注入);桌面专属,默认不编译。
#[cfg(feature = "voice-live")]
pub mod voice_live;
// 自动更新依赖 Tauri updater/restart/package_info → 桌面专属（Docker 用 docker pull 更新）。
#[cfg(feature = "desktop")]
pub mod updater;
// 原生标题栏染色（随主题切换，仅桌面窗口有标题栏）
#[cfg(feature = "desktop")]
pub mod titlebar;

// ── Docker(server) 外壳：shim AppHandle + axum HTTP/WS 服务 ──
#[cfg(feature = "server")]
pub mod host;
#[cfg(feature = "server")]
pub mod server;

#[cfg(feature = "desktop")]
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        // 自动更新（前端在启动时检查 GitHub Releases）+ 重启
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // 全局 panic 钩子(24/7 长稳第一道):任何后台线程(盘点/索引/做梦/热键/采集等)
            // panic 时,不再被默默吞掉成「死掉的子系统」,而是 eprintln + best-effort 追加到
            // 临时目录下的 polaris-panics.log(留耐久记录便于事后复盘)。链上一手以保留默认行为,
            // 不改 unwind 语义(绝不 abort)。std panic 钩子在运行时执行,故 SystemTime::now() 可用。
            let prev = std::panic::take_hook();
            std::panic::set_hook(Box::new(move |info| {
                let msg = format!("[panic] {info}");
                eprintln!("{msg}");
                if let Ok(mut f) = std::fs::OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(std::env::temp_dir().join("polaris-panics.log"))
                {
                    use std::io::Write;
                    let ts = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .map(|d| d.as_secs())
                        .unwrap_or(0);
                    let _ = writeln!(f, "{ts} {msg}");
                }
                prev(info);
            }));
            let h = app.handle();
            kb::init(h).map_err(|e| -> Box<dyn std::error::Error> { e.to_string().into() })?;
            conv::init(h).map_err(|e| -> Box<dyn std::error::Error> { e.to_string().into() })?;
            chat::init(h).map_err(|e| -> Box<dyn std::error::Error> { e.to_string().into() })?;
            claude_md::init(h)
                .map_err(|e| -> Box<dyn std::error::Error> { e.to_string().into() })?;
            provider::init(h)
                .map_err(|e| -> Box<dyn std::error::Error> { e.to_string().into() })?;
            // 确保「极速下载」技能落盘（含 fast_download.py：跨平台 aria2c 多连接下载器，
            // spawn 的 claude agent 才能在磁盘上直接 `uv run …/fast_download.py` 跑它）。best-effort。
            skills::seed_turbo_download_skill();
            // 确保「浏览器智能体 browser-use」技能落盘（含 browser_use_runner.py：browser-use
            // 经 CDP 驱动 CloakBrowser，spawn 的 claude agent 才能直接 `uv run …` 跑它）。best-effort。
            skills::seed_browser_use_skill();
            // 确保「壹伴排版优化」技能落盘（含 wechat_yiban.py：壹伴样式引擎 + CloakBrowser 驱动，
            // spawn 的 claude agent 才能在磁盘上直接 python 跑它）。best-effort，不阻断启动。
            skills::seed_wechat_typesetter_skill();
            // 确保「微信聊天 · 每日待办」技能落盘（含 wx_daily.py / wx_setup.py：本地解密微信→挖待办→
            // 写晨报，配套每日自动化流程触发）。best-effort，不阻断启动；不覆盖用户的 wx_config.json。
            skills::seed_wechat_tasks_skill();
            // 环境预热: 后台把 claude / pwsh 目录塞进进程 PATH + 设 Git Bash 路径,
            // 让之后 spawn 的 claude CLI 直接「找得到、有 shell」, 无需重启 (见 doctor.rs)。
            doctor::prime_path_for_claude();
            // 自动更新状态机初始化（记录当前版本 + 持久化路径 + 重启续提示）。best-effort。
            let _ = updater::init(h);
            // 语音输入「极速说」:配置 + 个人词表(首启种子)就位,供防污染秒达档使用。
            voice::init();
            // 寓言计划:检索枢纽(fable.db 表结构就位;盘点/索引由用户在设置页触发)。
            fable::init();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // KB
            kb::kb_root,
            kb::kb_default_root,
            kb::kb_set_root,
            kb::kb_scan,
            kb::kb_compile,
            kb::kb_list,
            kb::kb_read,
            kb::kb_delete,
            kb::kb_clear,
            kb::kb_search,
            kb::kb_ingest,
            kb::kb_upload_files,
            kb::kb_convert_batch,
            kb::kb_graph,
            kb::kb_lint,
            kb::kb_enrich_links,
            kb::kb_dedup,
            // 名人资料包（下载到自己的资料库，附带配套 skill）
            kb::kb_pack_list,
            kb::kb_pack_install,
            kb::kb_pack_remove,
            // 全盘资源归集（扫描 C/D 盘 → 多维表格 → 归档资源库 / 摄入核心层）
            scan::scan_roots,
            scan::scan_resources,
            // Conv (项目 + 对话历史)
            conv::conv_list_projects,
            conv::conv_create_project,
            conv::conv_archive_project,
            conv::conv_open_project_dir,
            conv::conv_list_conversations,
            conv::conv_create_conversation,
            conv::conv_delete_conversation,
            conv::conv_rename_conversation,
            conv::conv_get_messages,
            conv::conv_set_project_kb_scope,
            // 百人专家团
            expert::expert_list,
            expert::expert_list_by_group,
            expert::expert_groups,
            expert::expert_route,
            expert::expert_get,
            expert::expert_match_auto,
            expert::expert_apply,
            expert::expert_avatar,
            expert::expert_avatar_slots,
            expert::expert_team_spawn,
            expert::expert_agents_status,
            expert::expert_teams,
            expert::expert_team_get,
            expert::team_apply,
            expert::expert_export,
            expert::team_export,
            expert::expert_route_debug,
            expert::expert_recommend_from_kb,
            // 色彩调配引擎 (全 app 配色唯一真源)
            palette::palette_generate,
            // Chat
            chat::chat_send,
            chat::chat_cancel,
            chat::chat_attach_files,
            chat::chat_attach_image,
            chat::open_url,
            chat::chat_build_manifest,
            chat::artifact_read,
            chat::artifact_write,
            chat::artifact_open_external,
            chat::artifact_reveal,
            chat::artifact_list,
            chat::artifact_search,
            // CLAUDE.md
            claude_md::claude_md_list_projects,
            claude_md::claude_md_kb_info,
            claude_md::claude_md_read,
            claude_md::claude_md_write,
            // Skills
            skills::list_skills,
            skills::get_skill,
            skills::create_skill,
            skills::install_skill,
            skills::import_skill,
            skills::delete_skill,
            // API 供应商坞 + 用量看板
            provider::provider_list,
            provider::provider_switch,
            provider::provider_set_link_mode,
            provider::provider_save,
            provider::provider_delete,
            provider::usage_summary,
            provider::provider_balance,
            provider::codex_status,
            provider::codex_start_login,
            provider::codex_poll_login,
            provider::claude_oauth_status,
            provider::claude_start_login,
            provider::claude_finish_login,
            codex_proxy::codex_proxy_info,
            // 环境医生 (环境监测 + 配置安装)
            doctor::env_check,
            doctor::env_fix_path,
            doctor::env_install_claude,
            doctor::env_install_node,
            doctor::env_install_pwsh,
            doctor::env_install_uv,
            doctor::env_uv_cache_info,
            doctor::env_uv_cache_clean,
            doctor::env_claude_update_check,
            doctor::env_update_claude,
            doctor::env_cancel,
            // 自动更新状态机 (借鉴 OpenCode updater-controller: 单飞 + 可观测 + 持久化续提示)
            updater::updater_get_state,
            updater::updater_check,
            updater::updater_apply,
            // 原生标题栏染色（主题切换联动）
            titlebar::set_titlebar_color,
            // 语音输入「极速说」:配置 / 个人词表 / 防污染(秒达档)/ 词表自学
            voice::voice_config_get,
            voice::voice_config_set,
            voice::voice_lexicon_get,
            voice::voice_hotword_add,
            voice::voice_hotword_remove,
            voice::voice_correction_add,
            voice::voice_correction_remove,
            voice::voice_anti_pollute,
            voice::voice_learn_correction,
            voice::voice_lexicon_learn,
            voice::voice_transcribe_file,
            voice::voice_listen_start,
            voice::voice_listen_stop,
            voice::voice_dictate_start,
            voice::voice_dictate_stop,
            // 对话归档(conv 核心:置归档标志)
            conv::conv_archive_conversation,
            kb::kb_overview_get,
            // 寓言计划 · 检索枢纽(盘点 L1a + 向量索引 + 塌平混检)
            fable::fable_status,
            fable::fable_cancel,
            fable::inventory::fable_inventory_start,
            fable::inventory::fable_scan_folders,
            fable::inventory::fable_scan_folder_children,
            fable::inventory::fable_folder_size,
            fable::inventory::fable_backfill_lang,
            fable::index::fable_index_start,
            fable::index::fable_index_optimize,
            fable::retrieve::fable_search,
            fable::eval::fable_eval,
            fable::eval::fable_eval_template,
            // 文件中心(知识库内的可视化文件库:类型/语义聚类/缩略图/速览)
            fable::files::file_overview,
            fable::files::file_grid,
            fable::files::file_thumb,
            fable::files::file_gist,
            fable::files::file_cluster_build,
            fable::files::file_smart_cluster,
            fable::files::file_profile_html,
            fable::files::file_suggest_workflows,
            fable::files::file_graph,
            fable::files::file_warm_thumbs,
            fable::files::file_cluster_llm,
            fable::files::file_titles_llm,
            fable::files::file_titles_clear,
            fable::files::file_cluster_model_get,
            fable::files::file_cluster_model_set,
            fable::ontology::ontology_schemas,
            fable::ontology::ontology_overview,
            fable::ontology::ontology_seed,
            fable::ontology::ontology_extract,
            fable::ontology::ontology_triples,
        ])
        .build(tauri::generate_context!())
        .expect("error while building Polaris application")
        .run(|_app, event| {
            // App 退出 (关窗 / 主动退出) 时回收所有在飞的 claude 子进程树, 防孤儿继续占端口/CPU。
            if matches!(
                event,
                tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit
            ) {
                chat::kill_all_children();
                // 释放全局键盘热键监听:置 ENABLED=false,退出时不再处理热键事件
                //(rdev::listen 无法干净中止是已知限制,置闸 + 进程退出即可接受的清理)。
                #[cfg(feature = "voice-live")]
                voice_live::stop();
            }
        });
}
