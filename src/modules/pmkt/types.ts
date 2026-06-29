/**
 * PMKT 营销策略工作流 —— 数据形状定义。
 *
 * JSON schema 与参考实现 (PMKT_营销策略工作流.html) 1:1 保持一致，
 * 渲染逻辑与字段名完全对齐，便于「AI 的脑 = 我的脑」方法论落地。
 * 字段全部用中文键名（与 prompt 里要求模型输出的 schema 完全相同）。
 */

/** 第一步输入参数（趋势雷达表单）。 */
export interface PmktInputs {
  /** 机型 / 品类。 */
  model: string;
  /** 目标市场。 */
  market: string;
  /** 竞品（逗号分隔）。 */
  competitors: string;
  /** 用户年龄段。 */
  age: string;
  /** 一次 run 的唯一 id（用于历史记录 keyed by model+market+runId）。 */
  _runId?: number;
}

/** 情绪枚举（参考实现里 sentBadge 的取值）。 */
export type Sentiment = "negative" | "positive" | "neutral" | "mixed";

/** 第一步：趋势雷达 — 单条话题。 */
export interface TopicItem {
  话题: string;
  /** 必须为搜索结果里直接抠出的英文原话，不许编造、不许翻译。 */
  用户原话: string;
  /** 真实出现过的来源 URL。 */
  原话来源: string;
  情绪: Sentiment | string;
  /** 营销机会分 1-10。 */
  营销机会分: number;
  打分理由: string;
  /** 关联卖点：相机/电池/价格/系统/外观/网络/品牌/AI。 */
  关联卖点: string;
}

/** 第一步汇总。 */
export interface Step1Summary {
  高机会话题Top3: string[];
  竞品被吐槽点: string[];
  可直接套用的用户原话Top5: string[];
}

/** 第一步完整产物。 */
export interface Step1Data {
  话题列表: TopicItem[];
  汇总: Step1Summary;
}

/** 第二步：人群解码 — 单个人群。 */
export interface PersonaItem {
  群体名称: string;
  占比估计: string;
  核心特征: string;
  决策驱动: string;
  /** 必须从第一步引用的英文原文。 */
  代表性原话: string;
  购买力区间: string;
  主要触媒: string[];
}

/** 第二步完整产物。 */
export interface Step2Data {
  人群: PersonaItem[];
  人群对比洞察: string;
}

/** 第三步：产品锚点 — 单个卖点锚点。 */
export interface AnchorItem {
  锚点名称: string;
  对应人群: string[];
  用户证据: string;
  竞品差异点: string;
  优先级: number;
  建议文案方向: string;
}

/** 第三步完整产物。 */
export interface Step3Data {
  卖点锚点: AnchorItem[];
}

/** 第四步：策略蓝图 — 渠道优先级条目。 */
export interface ChannelItem {
  渠道: string;
  理由: string;
  投入占比建议: string;
}

/** 第四步 — 内容选题条目。 */
export interface ContentTopic {
  选题: string;
  格式: string;
  对应锚点: string;
  对应人群: string;
  预期效果: string;
}

/** 第四步完整产物。 */
export interface Step4Data {
  核心营销主张: string;
  渠道优先级: ChannelItem[];
  内容选题Top5: ContentTopic[];
  AB测试假设: string[];
  "30天落地建议"?: string;
  落地建议?: string;
}

/** 模块整体 state（持久化到 localStorage）。 */
export interface PmktState {
  inputs: PmktInputs | null;
  step1: Step1Data | null;
  step2: Step2Data | null;
  step3: Step3Data | null;
  step4: Step4Data | null;
}

/** 历史记录条目（keyed by model+market+runId，最多保留 30 条）。 */
export interface HistoryEntry {
  runId: number;
  time: string;
  inputs: PmktInputs;
  /** 完成到第几步。 */
  stepsComplete: number;
  step1: Step1Data | null;
  step2: Step2Data | null;
  step3: Step3Data | null;
  step4: Step4Data | null;
}

/** 阶段编号。 */
export type StageNo = 1 | 2 | 3 | 4;

/** 控制台日志行（左侧 Agent Console 实时滚动）。 */
export interface ConsoleLine {
  /** text = 模型流式文本片段；tool = 工具调用；info/error = 阶段提示。 */
  kind: "text" | "tool" | "info" | "error";
  text: string;
  at: number;
}

export const STAGE_LABELS: Record<StageNo, string> = {
  1: "趋势雷达",
  2: "人群解码",
  3: "产品锚点",
  4: "策略蓝图",
};

/** localStorage key 前缀。 */
export const LS = {
  state: "chuanying.pmkt.state.v1",
  history: "chuanying.pmkt.history.v1",
} as const;
