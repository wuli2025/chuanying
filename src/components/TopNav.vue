<script setup lang="ts">
/**
 * TopNav —— 新外壳顶部条：品牌 + 「选项」下拉(快捷入口) + 模块 tab 切换 + 供应商 + 设置/更多。
 * 「最上面用来切换」：对话核心 + 三个营销应用场景；其余能力进「选项」下拉或「更多」。
 * 环境配置(env) 只在右侧「更多」里，不再单独露出。
 */
import { Settings2 } from "@lucide/vue";
import { useAppStore, type ModuleTab } from "../stores/app";

const app = useAppStore();

const tabs: { key: ModuleTab; label: string; hint: string }[] = [
  { key: "koc", label: "KOC 筛选", hint: "达人招募筛选工作流" },
  { key: "competitive", label: "竞品分析", hint: "增长标杆 / 危机诊断" },
  { key: "pmkt", label: "营销策略", hint: "趋势→人群→锚点→蓝图" },
];
</script>

<template>
  <header class="topnav">
    <nav class="tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="tab"
        :class="{ on: app.moduleTab === t.key }"
        :title="t.hint"
        @click="app.setModuleTab(t.key)"
      >
        {{ t.label }}
      </button>
    </nav>

    <div class="right">
      <button class="more" title="设置 / 更多（含环境配置）" @click="app.openSettings()">
        <Settings2 :size="17" />
        <span>更多</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.topnav {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 48px;
  padding: 0 12px 0 14px;
  background: var(--bg-side);
  border-bottom: 1px solid var(--hairline);
  flex: 0 0 auto;
  -webkit-app-region: drag;
}
.topnav button,
.topnav :deep(*) {
  -webkit-app-region: no-drag;
}
.brand {
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: var(--serif, inherit);
  white-space: nowrap;
}
.brand-ico {
  color: var(--primary);
}
.brand-name {
  font-size: 15px;
  letter-spacing: 1px;
  color: var(--text);
}
.brand-name b {
  color: var(--primary);
  font-weight: 700;
}
/* 「选项」下拉 */
.opts {
  position: relative;
  flex: 0 0 auto;
}
.opts-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  border: 1px solid var(--hairline);
  background: var(--panel, transparent);
  color: var(--muted);
  font-size: 12.5px;
  padding: 5px 9px 5px 11px;
  border-radius: 9px;
  cursor: pointer;
  transition: background 0.14s, color 0.14s, border-color 0.14s;
}
.opts-btn:hover,
.opts-btn.on {
  color: var(--text);
  background: var(--primary-soft, rgba(120, 120, 160, 0.1));
}
.opts-caret {
  transition: transform 0.16s;
}
.opts-caret.flip {
  transform: rotate(180deg);
}
.opts-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
}
.opts-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 41;
  min-width: 164px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--bg-chat);
  border: 1px solid var(--hairline);
  border-radius: 11px;
  box-shadow: var(--shadow-lg, 0 12px 36px rgba(0, 0, 0, 0.28));
}
.opts-item {
  display: flex;
  align-items: center;
  gap: 9px;
  text-align: left;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text);
  font-size: 13px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
}
.opts-item:hover {
  background: var(--primary-soft, rgba(120, 120, 160, 0.1));
}
.oi {
  color: var(--primary);
  flex: 0 0 auto;
}
.tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1 1 auto;
  min-width: 0;
  overflow-x: auto;
}
.tab {
  border: 1px solid transparent;
  background: transparent;
  color: var(--muted);
  font-size: 13.5px;
  padding: 6px 14px;
  border-radius: 9px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.14s, color 0.14s, border-color 0.14s;
}
.tab:hover {
  background: var(--primary-soft, rgba(120, 120, 160, 0.1));
  color: var(--text);
}
.tab.on {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
  box-shadow: var(--shadow, 0 1px 3px rgba(0, 0, 0, 0.12));
}
.right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}
.more {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--hairline);
  background: var(--panel, transparent);
  color: var(--muted);
  font-size: 12.5px;
  padding: 5px 10px;
  border-radius: 9px;
  cursor: pointer;
}
.more:hover {
  color: var(--text);
  background: var(--primary-soft, rgba(120, 120, 160, 0.1));
}
</style>
