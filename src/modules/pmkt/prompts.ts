/**
 * PMKT 营销策略工作流 —— prompt 模板。
 *
 * 与参考实现 (PMKT_营销策略工作流.html) 的 promptStep1..4 + 硬约束（硬约束）逐字对齐，
 * 方法论核心不变：「AI 的脑 = 我的脑」——证据驱动、保留未翻译的英文原话 + 真实 URL、
 * 没有真实 quote 的话题直接丢弃；反向卖点机会分公式 = 抱怨/赞美高频 + 我们有故事可讲 + 竞品也有此问题。
 *
 * 与参考实现的唯一差异（按需求）：
 *   去掉 Tavily 外部依赖。Claude Code 自带 WebSearch / WebFetch，故第一步改为
 *   指示 agent **自己做真实网络检索**（reddit / problem / vs-competitor / africa 查询策略作为指引），
 *   返回逐字英文原话 + 真实来源 URL。这就是「让数据变真」的关键。
 */
import type { PmktInputs, Step1Data, Step2Data, Step3Data } from "./types";

/** 第一步检索查询策略（作为给 agent 的检索指引，agent 用自带 WebSearch 执行）。 */
export function buildStep1Queries(inputs: PmktInputs): string[] {
  const firstComp = (inputs.competitors.split(",")[0] || "").trim();
  return [
    `${inputs.model} review reddit`,
    `${inputs.model} problem complaint ${inputs.market}`,
    `${inputs.model} vs ${firstComp} reddit`,
    `best budget smartphone ${inputs.market} 2026 reddit`,
    `${inputs.model} battery camera review africa`,
  ];
}

/**
 * 第一步：趋势雷达。
 * 让 Claude 用自带 WebSearch/WebFetch 真实检索 → 提炼真实用户声音 → 话题清单。
 */
export function promptStep1(inputs: PmktInputs): string {
  const queries = buildStep1Queries(inputs);
  return `你是一个为传音手机做海外市场用户洞察的研究员。

任务：用你自带的联网检索能力（WebSearch / WebFetch），扫描 Reddit / Twitter/X / YouTube 评测 / 评测网站上的真实用户声音，对每条话题打营销机会分（1-10），做成话题清单。

输入：
- 机型：${inputs.model}
- 目标市场：${inputs.market}
- 竞品：${inputs.competitors}
- 用户年龄段：${inputs.age}

【检索策略 — 请真实执行下面这些 query（可自行扩展同义查询），从返回的真实网页里抠英文原话】
${queries.map((q, i) => `  ${i + 1}. ${q}`).join("\n")}

【硬约束】
1. 用户原话字段必须是你从真实搜索/网页结果里**直接抠出的英文原话**，逐字、未翻译、不许编造。如果某话题没有真实英文 quote 可引用，该话题就不要输出。
2. 原话来源必须是你检索时实际访问到的真实 URL（reddit 帖子链接 / 评测页 / 视频页等），不许编造 URL。
3. 每条话题打 1-10 营销机会分。营销机会分高 = 抱怨/赞美高频 + 我们的产品有故事可讲 + 竞品也有类似问题（反向卖点）。给出打分理由。
4. 关联到具体卖点维度：相机/电池/价格/系统/外观/网络/品牌/AI。

【JSON 输出铁律】
- 最终只输出一个合法 JSON 对象，前后不要任何解释文字、不要 markdown 围栏。
- 用户原话字段：若英文原话里本身含有双引号，必须改成单引号，绝不能出现未转义的双引号，否则 JSON 会坏。
- 不要有尾随逗号。

严格符合下面 schema：
{
  "话题列表": [
    {
      "话题": "夜景拍照在户外光线下表现差",
      "用户原话": "Night mode on Hot 50 is basically useless outdoors here",
      "原话来源": "https://reddit.com/r/Africa/...",
      "情绪": "negative",
      "营销机会分": 7,
      "打分理由": "高频抱怨 + 竞品也有此问题 → 反向卖点机会",
      "关联卖点": "相机"
    }
  ],
  "汇总": {
    "高机会话题Top3": ["话题1", "话题2", "话题3"],
    "竞品被吐槽点": ["..."],
    "可直接套用的用户原话Top5": ["原话1", "原话2"]
  }
}
至少输出 8 条话题，覆盖正负面、覆盖至少 4 个卖点维度。每条话题的「用户原话」必须是真实检索到的英文原文 + 真实来源 URL。`;
}

/** 第二步：人群解码。 */
export function promptStep2(inputs: PmktInputs, step1: Step1Data): string {
  return `基于第一步抓到的真实用户声音，把 ${inputs.market} 市场 ${inputs.age} 岁人群按购买决策逻辑聚类成 3-5 个具体人群。

第一步原始数据：
${JSON.stringify(step1, null, 2)}

【硬约束】
1. 每个人群必须给出占比估计（基于话题分布的合理推测，不必精确）。
2. 每个人群必须引用第一步里的至少 1 条真实英文原话作为代表性 quote（逐字、英文原文、不翻译）。
3. 决策驱动要具体到「他们买手机时最看重 X，因为 Y」，Y 要能从原话里推出来。

只输出 JSON（前后不要任何解释文字、不要 markdown 围栏）：
{
  "人群": [
    {
      "群体名称": "拉各斯打工大学生",
      "占比估计": "约 35%",
      "核心特征": "...",
      "决策驱动": "最看重电池续航，因为...",
      "代表性原话": "原话（必须从第一步引用，英文原文）",
      "购买力区间": "$80-150",
      "主要触媒": ["TikTok", "WhatsApp 群"]
    }
  ],
  "人群对比洞察": "哪个人群最值得优先打、为什么"
}`;
}

/** 第三步：产品锚点。 */
export function promptStep3(inputs: PmktInputs, step1: Step1Data, step2: Step2Data): string {
  return `基于第一步话题 + 第二步人群，提炼 ${inputs.model} 在 ${inputs.market} 应该重点讲的 4-6 个产品锚点（卖点）。

第一步：${JSON.stringify(step1.汇总, null, 2)}
第二步：${JSON.stringify(step2, null, 2)}

【硬约束】
1. 每个锚点必须挂到至少 1 个人群。
2. 必须引用至少 1 条用户原话作为「用户证据」（逐字、英文原文）。
3. 必须指出「竞品差异点」——这个卖点和 ${inputs.competitors} 比有什么独特。
4. 排序按「优先级」：首要锚点放最前。

只输出 JSON（前后不要任何解释文字、不要 markdown 围栏）：
{
  "卖点锚点": [
    {
      "锚点名称": "夜拍也清晰",
      "对应人群": ["拉各斯打工大学生", "..."],
      "用户证据": "Night mode on competitor is useless...",
      "竞品差异点": "Tecno Spark 同价位夜拍模糊，我们AI夜景实测胜出",
      "优先级": 1,
      "建议文案方向": "对比型短视频 + UGC 实测"
    }
  ]
}`;
}

/** 第四步：策略蓝图。 */
export function promptStep4(
  inputs: PmktInputs,
  _step1: Step1Data,
  step2: Step2Data,
  step3: Step3Data
): string {
  return `给 ${inputs.model} 在 ${inputs.market} 市场出一份可执行的营销策略蓝图。

第三步锚点：${JSON.stringify(step3, null, 2)}
第二步人群：${JSON.stringify(step2.人群, null, 2)}

【硬约束】
1. 渠道建议必须基于第二步「主要触媒」字段。
2. 选题 Top5 每条必须挂到一个锚点 + 一个人群，标注预期效果。
3. AB 测试假设要可量化（比如「假设标题用电池痛点点击率比相机痛点高 20%」）。

只输出 JSON（前后不要任何解释文字、不要 markdown 围栏）：
{
  "核心营销主张": "一句话讲清楚",
  "渠道优先级": [
    {"渠道": "TikTok", "理由": "...", "投入占比建议": "40%"}
  ],
  "内容选题Top5": [
    {
      "选题": "...",
      "格式": "短视频/图文/直播",
      "对应锚点": "...",
      "对应人群": "...",
      "预期效果": "..."
    }
  ],
  "AB测试假设": ["假设1...", "假设2..."],
  "30天落地建议": "前2周做什么、后2周做什么"
}`;
}
