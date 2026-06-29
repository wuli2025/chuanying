/**
 * KOC 筛选工作流 —— 数据形状定义。
 *
 * 移植自参考实现 (koc-workflow-main/index.html) 的「canonical KOC 对象形状」、
 * 8 维评分引擎产物、26 列 Tracking 模板、结构化 Brief。
 *
 * 关键修复（对齐需求里用户提出的问题）：
 *  - 统一字段名：参考实现里 `engRate` / `engagementRate`、`kocDB` / `kocData` 混用导致 bug，
 *    这里全部收敛为 `engagementRate`，并补 EVENT LOG / provenance / AI 评判字段。
 *  - 持久化一切：kocData / trackingList / briefs / videoMonitor / scripts / runs / events。
 */

/** 平台。 */
export type Platform = "tiktok" | "instagram" | "youtube";

/** 初筛状态（决定徽标颜色）。 */
export type KocStatus = "pass" | "risk" | "fail";

/** 入库等级。 */
export type EntryGrade = "A" | "B" | "C" | "不入库";

/** 8 个加权评分维度的 key。 */
export type MetricKey =
  | "contentBrandFit"
  | "targetAudienceOverlap"
  | "nigeriaLocalAudience"
  | "accountAuthenticity"
  | "kolTypeGrade"
  | "collabReputation"
  | "outputStability"
  | "competitorConflict";

/** 每个指标值的来源（provenance）—— 让「指标从哪来」可见。 */
export type Provenance = "user" | "inferred" | "ai";

/** 单个指标的可解释结果：分值 + 来源 + 说明。 */
export interface MetricResult {
  /** 0-10。 */
  value: number;
  /** user = 用户填的；inferred = 启发式推断；ai = Claude 评判。 */
  provenance: Provenance;
  /** 该来源的简短说明（用户填了什么 / 推断依据 / AI 理由）。 */
  note?: string;
}

/** scoreKOC 的产物。 */
export interface ScoreResult {
  /** 综合评分 0-100。 */
  score: number;
  verdict: string;
  status: KocStatus;
  entryGrade: EntryGrade;
  failReasons: string[];
  risks: string[];
  /** 8 维明细（含 provenance）。 */
  scoring: Record<MetricKey, MetricResult>;
}

/** AI 定性评判（与数值分并列）。 */
export interface AiJudgment {
  /** A/B/C/不入库 —— AI 给的定性结论。 */
  verdict: string;
  /** 推理（结合 brief + 标准）。 */
  reasoning: string;
  /** AI 认为的关键风险点。 */
  risks: string[];
  /** 0-100，AI 自评契合度（仅供参考，不覆盖数值分）。 */
  fitScore?: number;
  at: number;
}

/** 一条 KOC 的事件日志（什么动作、输入、输出、时间）。 */
export interface KocEvent {
  id: string;
  /** 动作类型。 */
  kind:
    | "created"
    | "imported"
    | "scored"
    | "ai-judge"
    | "brief"
    | "script"
    | "tracking"
    | "edit"
    | "note";
  /** 人类可读标题。 */
  title: string;
  /** 输入摘要。 */
  input?: string;
  /** 产物摘要（Claude 输出片段等）。 */
  output?: string;
  at: number;
}

/**
 * Canonical KOC 对象。
 * 数值指标字段（contentBrandFit 等）既可由用户/CSV 提供（字符串等级或数字），
 * 也可留空由启发式推断；AI 评判结果单独挂在 aiJudgment。
 */
export interface Koc {
  id: string;
  platform: Platform;
  name: string;
  username: string;
  url: string;

  // 基础画像
  city?: string;
  school?: string;
  whatsapp?: string;
  tier?: string;
  category?: string;
  styleTag?: string;
  bio?: string;
  region?: string;
  geoLabel?: string;
  language?: string;
  audienceAge?: string;

  // 量化数据
  followers: number;
  avgViews?: number;
  reelsAvg?: number;
  actViews?: number;
  actEngagement?: number;
  /** 互动率 %（统一字段名，修复 engRate/engagementRate 混用 bug）。 */
  engagementRate?: number;

  // 本地受众占比
  nigeriaLocalAudience?: number | string;
  lagosAudience?: number;
  ibadanAudience?: number;
  audienceCity?: string;
  audienceCityRate?: number;

  // 合作执行
  ksp?: string;
  script?: string;
  collabFee?: number;
  price?: number;
  collabType?: string;
  postDate?: string;
  postLink?: string;
  shippingAddress?: string;
  brandCollaboration?: string;
  brandExp?: string;
  hasInstagram?: string;
  recruitmentSource?: string;
  source?: string;
  frequency?: string;
  growthTrend?: string;
  accountAge?: string;
  hasTechContent?: string;
  remark?: string;

  // 用户/CSV 直接提供的指标（字符串等级 a/b/c 或数字），留空则推断
  contentBrandFit?: number | string;
  targetAudienceOverlap?: number | string;
  accountAuthenticity?: number | string;
  kolTypeGrade?: number | string;
  collabReputation?: number | string;
  outputStability?: number | string;
  competitorConflict?: number | string;

  // 标签 / 风险
  tags?: string[];
  manualRisks?: string[];

  // 评分产物（持久化）
  score?: number;
  verdict?: string;
  status?: KocStatus;
  entryGrade?: EntryGrade;
  failReasons?: string[];
  risks?: string[];
  scoring?: Record<MetricKey, MetricResult>;

  // AI 定性评判（与数值分并列）
  aiJudgment?: AiJudgment;

  // 产物（修复参考实现 reload 丢脚本的问题 —— 持久化）
  videoScript?: string;

  // 审计
  source_type?: "manual" | "csv" | "ai-collect" | "seed";
  events?: KocEvent[];
  addedAt?: string;
}

/** 合作 Brief 模板（第一阶段表单）。 */
export interface BriefTemplate {
  product: string;
  ksp: string;
  audience: string;
  price: string;
  collabForm: string;
  /** 投流预警播放量，default 20000。 */
  boostThreshold: number;
  contentReq: string;
}

/** 结构化 Brief 产物（每位 KOC 一份）。 */
export interface BriefProductInfo {
  name: string;
  brand: string;
  sellingPoint: string;
  price: string;
  purchaseChannel: string;
  targetAudience: string;
}
export interface BriefKocFit {
  category: string;
  localAudience: string;
  instagram: string;
  source: string;
}
export interface BriefDirection {
  title: string;
  desc: string;
}
export interface BriefTerms {
  collaboration: string;
  deliverable: string;
  firstPost: string;
  duration: string;
  review: string;
  requiredTags: string[];
}
export interface BriefSubmission {
  afterPost: string;
  dataBack: string;
  contact: string;
  postLink: string;
}
export interface BriefContent {
  title: string;
  platform: string;
  kocLabel: string;
  profileLink: string;
  scoreLine: string;
  product: BriefProductInfo;
  kocFit: BriefKocFit;
  contentDirections: BriefDirection[];
  competitorLine: string;
  contentFormats: string[];
  avoid: string[];
  terms: BriefTerms;
  specs: string[];
  submission: BriefSubmission;
}
export interface Brief {
  kocId: string;
  content: BriefContent;
  /** Claude 生成的定制脚本（持久化，修复 reload 丢失）。 */
  script?: string;
  at: number;
}

/** 视频监测数据（每位 tracking KOC 一条）。 */
export interface VideoMonitor {
  postLink?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  updatedAt?: string;
}

/** 采集 / 筛选 RUN 记录（提供「历史/记录」）。 */
export interface ScreeningRun {
  id: string;
  /** collect = Claude 采集；score = 批量评分；judge = 批量 AI 评判。 */
  kind: "collect" | "score" | "judge";
  at: number;
  /** 输入条件摘要。 */
  inputSummary: string;
  /** 结果摘要。 */
  resultSummary: string;
  /** 期间 Claude 跑了哪些工具（审计 onTool）。 */
  tools: { tool: string; detail?: string; at: number }[];
  /** 产生 / 影响的 KOC id。 */
  kocIds: string[];
}

/** 控制台日志行（左侧 Agent Console 实时滚动）。 */
export interface ConsoleLine {
  kind: "text" | "tool" | "info" | "error" | "ok";
  text: string;
  at: number;
}

/** Claude 采集条件（第二阶段 b 模式）。 */
export interface CollectCriteria {
  keywords: string[];
  minFollowers: number;
  minViews: number;
  minEng: number;
  category: string;
  lang: string;
  geo: string;
  geoRate: string;
  limit: number;
}

/** 阶段编号。 */
export type StageNo = 1 | 2 | 3 | 4;

export const STAGE_LABELS: Record<StageNo, string> = {
  1: "合作 Brief",
  2: "筛选 KOC",
  3: "筛选结果",
  4: "KOC Tracking",
};

/** 8 维指标的中文标签 + 权重（移植自 scoreKOC weights）。 */
export const METRIC_META: Record<MetricKey, { label: string; weight: number }> = {
  contentBrandFit: { label: "内容与品牌契合度", weight: 15 },
  targetAudienceOverlap: { label: "受众与目标人群重叠度", weight: 15 },
  nigeriaLocalAudience: { label: "尼日利亚本地受众占比", weight: 15 },
  accountAuthenticity: { label: "账号真实性评估", weight: 15 },
  kolTypeGrade: { label: "KOL 类型分级", weight: 10 },
  collabReputation: { label: "历史合作口碑", weight: 10 },
  outputStability: { label: "内容产出稳定性", weight: 10 },
  competitorConflict: { label: "独家性 / 竞品冲突", weight: 10 },
};

export const METRIC_KEYS: MetricKey[] = Object.keys(METRIC_META) as MetricKey[];

/** Tier → 估算粉丝数（移植 TIER_FOLLOWERS）。 */
export const TIER_FOLLOWERS: Record<string, number> = {
  "1k-5k": 3000,
  "5k-10k": 7500,
  "10k-30k": 20000,
  "30k-100k": 65000,
  "50k-100k": 75000,
  "100k-300k": 200000,
  "300k+": 500000,
};

/** 26 列 Tracking 模板表头（移植 TRACKING_TEMPLATE_HEADERS）。 */
export const TRACKING_TEMPLATE_HEADERS: string[] = [
  "#",
  "Category",
  "KOC",
  "Platforms",
  "Profile Link",
  "Tier",
  "KSP",
  "Script",
  "Post Date",
  "Post Link",
  "Collaboration Fee (USD)",
  "Act. Views",
  "Act. Engagement",
  "Shipping Address",
  "Brand Collab?",
  "Instagram?",
  "Recruitment Source",
  "Content Brand Fit",
  "Target Audience Overlap",
  "Nigeria Local Audience %",
  "Account Authenticity",
  "KOL Type Grade",
  "Collab Reputation",
  "Output Stability",
  "Competitor Conflict",
  "Remark / Not-in Reason",
];

export const TRACKING_TEMPLATE_EXAMPLE: string[] = [
  "1",
  "Skin",
  "Chinnybaby042",
  "Tiktok",
  "https://www.tiktok.com/@chinnybaby042",
  "50k-100k",
  "Appearance+design",
  "Yes",
  "2026/06/14",
  "https://vt.tiktok.com/",
  "400",
  "",
  "",
  "Dormitory Building A / Room 305",
  "Yes",
  "Yes",
  "Referral",
  "9",
  "8",
  "70",
  "8",
  "A",
  "8",
  "8",
  "No",
  "",
];

export const PRESET_TAGS = [
  "搞笑",
  "生活方式",
  "产品测评",
  "校园",
  "科技",
  "美食",
  "时尚",
  "旅行",
  "音乐",
  "舞蹈",
  "Vlog",
  "时事",
];

/** localStorage key 前缀。 */
export const LS = {
  kocData: "chuanying.koc.kocData.v1",
  tracking: "chuanying.koc.trackingList.v1",
  briefs: "chuanying.koc.briefs.v1",
  briefTemplate: "chuanying.koc.briefTemplate.v1",
  videoMonitor: "chuanying.koc.videoMonitor.v1",
  runs: "chuanying.koc.runs.v1",
  seeded: "chuanying.koc.seeded.v1",
} as const;
