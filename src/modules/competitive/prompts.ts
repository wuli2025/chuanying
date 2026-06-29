/**
 * 竞品分析 Agent —— 真·多阶段流水线提示词。
 *
 * 原版的「回答得不行」根因：所有活儿塞进单次 gemini-flash + "只输出JSON、不要推理"，
 * 模型既没空间检索也没空间推理，只能瞎编。这里改成 Claude Code 的三段式：
 *   Stage 1 research  —— 真·联网检索（年报 / IDC·Counterpoint / 亚马逊评价 / 媒体），落地带引用的事实。
 *   Stage 2 reason    —— 自由文本分析（S&M 剥离 + 假设、JTBD、漏斗），把推理过程显式化。
 *   Stage 3 finalize  —— 仅此一步吐严格 JSON，对齐 schema，tag 区分 ok/est/待补充，VOC 带真实出处。
 * 三段复用同一 conversationId（在组件里串起来），所以 finalize 能看到前两段的检索与推理。
 *
 * DEMO_A / DEMO_B 作为 few-shot 范例嵌进 finalize，既锁形状又抬质量。
 */
import { DEMO_A, DEMO_B } from "./demo";

/* ────────────────────────── 通用片段 ────────────────────────── */

const HTML_NOTE =
  "富文本字段（lead / signal / body / why / desc / conclusion 等）可用且仅可用这些标签：" +
  "<b></b>、<em></em>、<p></p>、<span class='hl'></span>，不要用其它标签或内联 style。";

/** Stage 3 共用的硬约束：tag 纪律 + 只出 JSON。 */
const FINALIZE_RULES =
  "硬约束：\n" +
  "① tag 纪律——财报/权威报告原值标 tag:\"ok\"；经剥离或行业经验推算标 tag:\"est\"；" +
  "合计行标 tag:\"total\"；确实查不到的，宁可在该字段写「待补充」也绝不编造数字。\n" +
  "② 引用——VOC / source / src 必须来自 Stage 1 真实检索到的出处（媒体名、报告名、评论平台），不许虚构链接。\n" +
  "③ 数字一致——JSON 里的数字必须与 Stage 2 推理中的口径一致。\n" +
  "④ 只输出 JSON 本体，不要 markdown 围栏、不要任何解释文字。\n" +
  HTML_NOTE;

/* ===========================================================================
 *  Mode A：增长标杆拆解（怎么赢的）
 * =========================================================================== */

export function researchPromptA(company: string, product: string): string {
  const p = product ? `，重点产品「${product}」` : "";
  return (
    `你是资深出海品牌营销策略分析师。现在要拆解「${company}」${p}是「怎么赢的」。\n` +
    `这是第 1 阶段：检索取证。请用 WebSearch / WebFetch 真实查证以下材料，逐条记录【事实 + 出处】：\n` +
    `1. 最新年报/财报：总营收及增速、销售费用(S&M)原值及增速、研发投入及增速、研发人员占比。\n` +
    `2. 销售费用结构线索：人员薪酬、平台/佣金费用、售后保修准备金等（用于后续剥离出「纯营销花费」）。\n` +
    `3. 创始人/管理层公开的产品方法论（如何选品类、如何从痛点反推研发）。\n` +
    `4. 重点产品的卖点文案、产品页主张、亚马逊/电商真实用户评价(VOC，记录原话与平台)。\n` +
    `5. 宣发打法：发布会/内容起爆、KOL/Creator、电商广告矩阵、DTC 独立站、各渠道大致权重。\n` +
    `请把检索到的关键事实分组列出，每条标注来源；查不到的明确写「未检索到」。这一步不要输出 JSON。`
  );
}

export function reasonPromptA(company: string): string {
  return (
    `第 2 阶段：基于上面检索到的事实做分析推理（自由文本，先别出 JSON）。请显式给出：\n` +
    `① 财务——用「S&M 剥离法」从销售费用原值里减去人员薪酬/平台费/售后准备金，估出「纯营销花费」，` +
    `把每一步的占比假设与依据写出来（哪些是财报原值 ok、哪些是行业典型值推算 est）。\n` +
    `② PMKT——提炼 ${company} 的痛点→场景→研发→包装链路与背后的方法论命名。\n` +
    `③ JTBD——挑一个代表产品，把卖点按用户决策路径排成 Job 序列，每个卖点配一句真实 VOC。\n` +
    `④ IMC——用 AICP(认知-兴趣-考量-转化)漏斗拆宣发，估各阶段预算占比与渠道占比，并指出战略漏洞。`
  );
}

export function finalizePromptA(company: string, product: string): string {
  const title = product ? `${company} · ${product}` : company;
  return (
    `第 3 阶段：把前面的检索与推理凝练成严格 JSON。\n` +
    `${FINALIZE_RULES}\n\n` +
    `参照下面这份「Anker」范例的字段结构与粒度（只学结构与写法，内容必须换成 ${company} 的真实拆解）：\n` +
    `${JSON.stringify(DEMO_A)}\n\n` +
    `现在输出 ${title} 的 JSON，结构与范例完全一致：\n` +
    `{"title":"${title}",` +
    `"ch1":{lead, kpis[4:总营收/销售费用/纯营销/研发，每个含 v/cls(red|blue|amber|green)/k/d/tag], ` +
    `rows[销售费用原值(ok)→各剥离项(est)→纯营销花费(total)，每行 item/amt/pct/src/tag], signal},` +
    `"ch2":{lead, theory:{title,body}, products[2-4，含 ico/name/pain/badge/bcls(r|b|g)], ` +
    `steps[4，含 en/title/desc/tags[]]},` +
    `"ch3":{lead, def, sellpoints[3-4，含 rank/layer/headline/job/why/voc], path[4，含 stage/q/a]},` +
    `"ch4":{lead, funnel[4=AICP，含 stg/en/pct/bud], detail[每阶段1条，含 lbl/text], ` +
    `channels[降序，含 name/pct(纯数字不带%)], weak:{title,text}},` +
    `"foot":"数据源与口径说明"}`
  );
}

/* ===========================================================================
 *  Mode B：危机诊断拆解（为何困）
 * =========================================================================== */

export function researchPromptB(company: string): string {
  return (
    `你是资深竞品竞争态势与危机诊断分析师。现在要诊断「${company}」「为何困」。\n` +
    `这是第 1 阶段：检索取证。请用 WebSearch / WebFetch 真实查证并逐条记录【事实 + 出处】：\n` +
    `1. 市场份额走势：历年/各季度份额与排名，标出关键拐点（来源 IDC / Counterpoint / Canalys）。\n` +
    `2. 高端价格段(如 3000 元以上)竞争：被哪些对手在哪些价位夹击，份额对比数据。\n` +
    `3. 营销/场景打法：主推场景、代言/IP 合作、影像或核心技术叙事；找出一个直接对手做对比。\n` +
    `4. 竞品对决：同一争夺场景里对手与 ${company} 的具体打法差异（技术先行 vs 流量先行）。\n` +
    `5. 公关/营销危机事件：时间、性质、舆论烈度（综合媒体报道）。\n` +
    `分组列出，逐条标来源；数据缺失处写「未检索到，将以趋势示意标注」。这一步不要输出 JSON。`
  );
}

export function reasonPromptB(company: string): string {
  return (
    `第 2 阶段：基于检索事实做诊断推理（自由文本，先别出 JSON）。请显式给出：\n` +
    `① 市占——勾画份额曲线与拐点的成因。\n` +
    `② 高端困局——${company} 在高端价格段被谁、从哪个方向夹击。\n` +
    `③ 场景战场——提炼对手「技术驱动+场景锚定」vs ${company}「流量驱动+场景漂移」两条对立路线。\n` +
    `④ 竞品对决——本质差距：谁先有产品力再提卖点，谁先有流量再反推场景。\n` +
    `⑤ 危机时间轴——给每个事件 1-10 的舆论烈度与类型，并把表层事件追溯到「市占焦虑→全链路变形」。`
  );
}

export function finalizePromptB(company: string): string {
  return (
    `第 3 阶段：把前面的检索与推理凝练成严格 JSON。\n` +
    `${FINALIZE_RULES}\n` +
    `补充：折线图 chart.data / series.data 必须是数字数组；markers 是与 data 等长的颜色数组` +
    `（拐点用 #1f9d57 绿 / #e5484d 红 / #9aa0aa 灰）；趋势示意数据请在 source 里注明「趋势示意」。\n\n` +
    `参照下面这份「OPPO」范例的字段结构与粒度（只学结构，内容换成 ${company} 的真实诊断）：\n` +
    `${JSON.stringify(DEMO_B)}\n\n` +
    `现在输出 ${company} 的 JSON，结构与范例完全一致：\n` +
    `{"title":"${company}·品牌危机数据图鉴","subtitle":"困境一句话",` +
    `"t1_share":{title,subtitle,source,chart:{labels[],data[],markers[]},stats[2-4，含 label/value/cls(g|r|a)]},` +
    `"t2_premium":{title,subtitle,source,chart:{labels[],series[{name,color,data[]}]},` +
    `cards[含 title/cls(g|r)/items[]]},` +
    `"t3_scene":{lead, a:{name/ncls(b|g)/tagline/points[{ico,title,sub}]/verdict{type(ok|warn),text}}, b:{同 a 结构}, ` +
    `poslead, posA:{name/ncls/since/items[]/slogan/sub/vtype(ok|warn)}, posB:{同 posA 结构}},` +
    `"t4_duel":{lead, sideA:{name,rows[{label,text}]}, sideB:{同 sideA}, essence:{title,rows[]}},` +
    `"t5_crisis":{lead, events[按时间，含 score(1-10)/name/date/type/cls(g=1-4|y=5-7|r=8-10)], conclusion},` +
    `"foot":"数据源与口径说明"}`
  );
}
