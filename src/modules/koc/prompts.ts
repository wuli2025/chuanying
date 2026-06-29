/**
 * KOC 筛选工作流 —— 4 个 prompt 模板。
 *
 * 全部走 Claude Code（useAgentRunner.runJson / run）。相对参考实现的关键改造：
 *  - 采集：参考实现用坏掉的 CORS 代理抓 TikTok（CORS 限制必失败）。改为让 Claude Code
 *    用自带 WebSearch/WebFetch 做真实采集，返回结构化 KOC JSON（onTool 可见「AI 跑了什么」）。
 *  - 脚本：参考实现靠剪贴板复制指令再粘回。改为 runJson 直接产出并自动落库。
 *  - AI 评判：参考实现没有。新增 —— 让 Claude 结合 brief + 标准定性评判每个 KOC。
 *  - Brief 文档抽取：参考实现复制指令让用户手动填。改为 runJson 直接抽出字段。
 */
import type { Koc, BriefTemplate, CollectCriteria, MetricKey } from "./types";
import { METRIC_META } from "./types";

const fmtNum = (n?: number): string => {
  if (!n && n !== 0) return "-";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(Math.round(n));
};

const JSON_RULE = `【JSON 输出铁律】
- 最终只输出一个合法 JSON，前后不要任何解释文字、不要 markdown 围栏。
- 字符串内若含双引号，改成单引号或转义为 \\"；不要尾随逗号。`;

/* ============================================================
   1) Brief 文档抽取 —— 上传/粘贴的 brief 文档 → 抽出表单字段
   ============================================================ */
export function promptBriefExtract(docText: string): string {
  return `你在帮一个手机品牌（如 Infinix Hot 70）整理 KOC 合作 Brief。请从下面的 Brief 文档里抽取关键字段。

---文档内容---
${docText.slice(0, 6000)}

请抽取并按 schema 输出（缺失字段给合理默认或留空字符串；boostThreshold 缺失则填 20000）：
{
  "product": "产品名称",
  "ksp": "核心卖点",
  "audience": "目标人群",
  "price": "官方售价",
  "collabForm": "合作形式",
  "boostThreshold": 20000,
  "contentReq": "内容要求 / 脚本方向（多行用 \\n 连接）"
}

${JSON_RULE}`;
}

/* ============================================================
   2) Claude 采集 —— 关键词 + 门槛 → 真实搜索 → 候选 KOC 列表
   ============================================================ */
export function promptCollect(cr: CollectCriteria, brief?: BriefTemplate | null): string {
  const keywords = cr.keywords.join("、") || "campus life, student tech review";
  const briefLine = brief
    ? `\n本次招募 brief：产品「${brief.product}」，核心卖点「${brief.ksp}」，目标人群「${brief.audience}」。优先采集与之契合的账号。`
    : "";
  return `你是为传音手机做海外 KOC 招募的研究员。请用你自带的联网检索能力（WebSearch / WebFetch），在 TikTok / Instagram 及公开网页上真实搜索符合条件的创作者账号，整理成候选 KOC 列表。${briefLine}

【采集条件】
- 搜索关键词：${keywords}
- 平台：优先 TikTok
- 最低粉丝量：${cr.minFollowers}
- 最低均播放量：${cr.minViews}
- 最低互动率：${cr.minEng}%
- 内容垂类：${cr.category || "不限"}
- 内容语言：${cr.lang || "不限"}
- 受众城市：${cr.geo || "不限"}${cr.geoRate ? `（覆盖率 ≥${cr.geoRate}%）` : ""}
- 目标数量：${cr.limit} 个

【硬约束】
1. 只收录你真实检索到的、能给出主页 URL 的账号；找不到真实数据的账号不要编造。
2. 粉丝 / 获赞 / 视频数等数字用你检索到的真实公开数据；拿不到的字段留空或给 0，不要瞎填。
3. 优先返回达标（满足粉丝 / 播放 / 互动门槛）的账号。
4. 尽量给出 bio / 地区 / 语言，便于后续评分。

按 schema 输出（数组，最多 ${cr.limit} 条）：
{
  "kocs": [
    {
      "name": "昵称",
      "username": "handle（不含@）",
      "url": "https://www.tiktok.com/@handle",
      "platform": "tiktok",
      "followers": 12000,
      "avgViews": 3000,
      "engagementRate": 4.2,
      "bio": "简介原文",
      "region": "NG",
      "city": "Lagos",
      "language": "English",
      "category": "campus",
      "nigeriaLocalAudience": 55
    }
  ]
}

${JSON_RULE}`;
}

/* ============================================================
   3) AI 定性评判 —— 结合 brief + 评分标准，给 verdict + reasoning
   ============================================================ */
export function promptJudge(koc: Koc, brief: BriefTemplate | null): string {
  const briefBlock = brief
    ? `产品：${brief.product}
核心卖点：${brief.ksp}
目标人群：${brief.audience}
售价：${brief.price}
合作形式：${brief.collabForm}
投流门槛播放量：${brief.boostThreshold}
内容要求：
${brief.contentReq}`
    : "（尚未填写 Brief 模板，按通用校园 KOC 招募标准评判）";

  const metricList = (Object.keys(METRIC_META) as MetricKey[])
    .map((k) => `  - ${METRIC_META[k].label}（权重 ${METRIC_META[k].weight}）`)
    .join("\n");

  return `你是资深 KOC 招募评审。请结合下面的合作 Brief 与 8 维评分标准，对这位 KOC 做一次**定性**评判（与确定性数值分并列，不替代它）。

【合作 Brief】
${briefBlock}

【8 维评分标准（每维 0-10）】
${metricList}

【待评判 KOC】
- 昵称 / 账号：${koc.name || koc.username} / @${koc.username}
- 平台：${koc.platform}
- 粉丝量：${fmtNum(koc.followers)}
- 均播放：${fmtNum(koc.avgViews)}
- 互动率：${koc.engagementRate != null ? koc.engagementRate + "%" : "未知"}
- 垂类：${koc.category || "未知"}
- 城市 / 地区：${[koc.city, koc.region].filter(Boolean).join(" / ") || "未知"}
- 语言：${koc.language || "未知"}
- 本地受众占比：${koc.nigeriaLocalAudience || "未知"}
- 标签：${(koc.tags || []).join("、") || "无"}
- 简介：${koc.bio || "无"}

请判断该 KOC 是否符合本次招募标准，给出：
1. verdict：A / B / C / 不入库（A=优先合作，B=观察合作，C=备用池，不入库=不建议）
2. reasoning：2-4 句中文推理，说清楚为什么 —— 它在哪几个维度强 / 弱、与 brief 契合点。
3. risks：你看到的关键风险点（数组，可为空）。
4. metrics：对你有把握的维度给 0-10 打分（key 用英文：${(Object.keys(METRIC_META) as string[]).join(", ")}），没把握的维度不要给。

按 schema 输出：
{
  "verdict": "B",
  "reasoning": "...",
  "risks": ["..."],
  "fitScore": 72,
  "metrics": { "contentBrandFit": 8, "targetAudienceOverlap": 7 }
}

${JSON_RULE}`;
}

/* ============================================================
   4) 脚本生成 —— 结合 brief + KOC 风格，写 TikTok 脚本（自动落库）
   ============================================================ */
export function promptScript(koc: Koc, brief: BriefTemplate | null): string {
  const tags = Array.isArray(koc.tags) && koc.tags.length ? koc.tags.join("、") : "未标注";
  const tmpl = brief || {
    product: "Infinix Hot 70",
    ksp: "颜值设计 + 45W 超级快充",
    price: "₦189,700",
    audience: "Lagos & Ibadan 在校大学生 18-25 岁",
    collabForm: "免费寄送一台（留用）",
    boostThreshold: 20000,
    contentReq: "",
  };
  return `你是一位专业的 KOC 内容策划，请根据以下信息为这位博主生成一份定制化的 TikTok 视频脚本。

【博主信息】
- 昵称：${koc.name || koc.username}
- 账号：@${koc.username}
- 粉丝量：${fmtNum(koc.followers)}
- 内容标签：${tags}
- 简介：${koc.bio || "无"}

【产品信息】
- 产品：${tmpl.product}
- 核心卖点（KSP）：${tmpl.ksp}
- 售价：${tmpl.price}
- 目标人群：${tmpl.audience}
- 合作形式：${tmpl.collabForm}
- 投流门槛：${tmpl.boostThreshold}

【内容要求】
${tmpl.contentReq || "（无额外内容要求）"}

【脚本要求】
请根据该博主的内容风格（${tags}），生成一份自然、符合其人设的视频脚本，包含：
1. 开场钩子（前 3 秒抓住注意力）
2. 产品展示节奏（结合博主风格）
3. 核心卖点的自然植入方式
4. 结尾 CTA + 标签

请用英语撰写脚本正文，语气贴合博主日常风格；分镜 / 节奏说明可用中文标注。直接输出脚本全文（可用 markdown），不需要 JSON。`;
}
