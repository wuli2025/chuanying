/**
 * KOC 确定性评分引擎 —— 忠实移植 koc-workflow-main/index.html 的 scoreKOC。
 *
 * 8 个加权维度（contentBrandFit15 / targetAudienceOverlap15 / nigeriaLocalAudience15 /
 * accountAuthenticity15 / kolTypeGrade10 / collabReputation10 / outputStability10 /
 * competitorConflict10）；metricScore / infer* fallback；verdict A/B/C/不入库；风险标记。
 *
 * 相对参考实现的增强（按需求「provenance 可见」）：
 *  - 每个指标记录 provenance：user（用户/CSV 提供）/ inferred（启发式）/ ai（Claude 评判）。
 *  - 保留为「可解释的数值层」：纯函数、无副作用、可单独 re-score。
 */
import type { Koc, MetricKey, MetricResult, ScoreResult, EntryGrade } from "./types";
import { METRIC_META, METRIC_KEYS, TIER_FOLLOWERS } from "./types";

/** Tier 别名归一（移植 normalizeTier）。 */
export function normalizeTier(value?: string): string {
  const v = String(value || "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s/g, "");
  const aliases: Record<string, string> = {
    "1k-5k": "1k-5k",
    "5k-10k": "5k-10k",
    "10k-30k": "10k-30k",
    "30k-100k": "30k-100k",
    "50k-100k": "50k-100k",
    "100k-300k": "100k-300k",
    "300k+": "300k+",
  };
  return aliases[v] || (value ?? "");
}

export function clampScore(n: number): number {
  return Math.min(10, Math.max(0, Number.isFinite(n) ? n : 5));
}

/**
 * metricScore —— 用户给了值就用（识别 a/b/c/high/low/yes/no 等级 + 数字/百分比），
 * 否则回落到启发式推断值。返回 { value, fromUser }。
 */
function metricScore(value: unknown, fallback: number): { value: number; fromUser: boolean } {
  if (value == null || String(value).trim() === "") {
    return { value: clampScore(fallback), fromUser: false };
  }
  const raw = String(value).trim().toLowerCase();
  const gradeMap: Record<string, number> = {
    a: 10,
    b: 7,
    c: 5,
    d: 2,
    high: 9,
    medium: 6,
    low: 3,
    yes: 8,
    no: 2,
    none: 10,
  };
  if (gradeMap[raw] != null) return { value: gradeMap[raw], fromUser: true };
  const num = parseFloat(raw.replace("%", ""));
  if (Number.isFinite(num)) return { value: clampScore(num > 10 ? num / 10 : num), fromUser: true };
  return { value: clampScore(fallback), fromUser: false };
}

export function getLocalAudienceScore(koc: Koc): number {
  const pct =
    Number(koc.nigeriaLocalAudience || 0) ||
    Number(koc.lagosAudience || 0) + Number(koc.ibadanAudience || 0);
  if (pct >= 70) return 10;
  if (pct >= 50) return 8;
  if (pct >= 30) return 6;
  if (pct >= 15) return 4;
  return 2;
}

function inferContentBrandFit(koc: Koc): number {
  const cat = String(koc.category || "").toLowerCase();
  const ksp = String(koc.ksp || "").toLowerCase();
  if (
    /(skin|beauty|tech|campus|lifestyle|fashion)/.test(cat) ||
    /(appearance|design|camera|battery|phone|tech)/.test(ksp)
  )
    return 8;
  if (/(food|sports|entertainment|dancer)/.test(cat)) return 6;
  return 5;
}

function inferTargetAudienceOverlap(koc: Koc): number {
  const cat = String(koc.category || "").toLowerCase();
  const age = String(koc.audienceAge || "").toLowerCase();
  if (age.includes("18-24") || /(campus|skin|beauty|lifestyle|fashion|tech)/.test(cat)) return 8;
  return 5;
}

function inferAccountAuthenticity(koc: Koc, avgViews: number, engRate: number): number {
  if (koc.followers > 10000 && avgViews > 0 && avgViews < 500) return 3;
  if (engRate > 0 && engRate < 1) return 3;
  if (avgViews > 0 || engRate > 0) return 7;
  return 5;
}

function inferKOLTypeGrade(koc: Koc): number {
  const tier = normalizeTier(koc.tier);
  if (["10k-30k", "30k-100k", "50k-100k"].includes(tier)) return 9;
  if (["5k-10k", "100k-300k"].includes(tier)) return 7;
  if (tier === "300k+") return 6;
  return 5;
}

function inferCollabReputation(koc: Koc): number {
  const brandCollab = String(koc.brandCollaboration || koc.brandExp || "").toLowerCase();
  if (brandCollab === "yes" || brandCollab === "是" || Number(koc.collabFee || 0) > 0) return 8;
  return 5;
}

function inferOutputStability(koc: Koc, avgViews: number): number {
  const frequency = String(koc.frequency || "").toLowerCase();
  if (frequency.includes("3-5") || frequency.includes("daily")) return 9;
  if (frequency.includes("1-2") || avgViews > 0) return 7;
  if (frequency.includes("irregular")) return 3;
  return 5;
}

function inferCompetitorConflict(koc: Koc): number {
  const value = String(koc.competitorConflict || "").toLowerCase();
  if (/(yes|有|冲突|绑定)/.test(value)) return 2;
  return 10;
}

/** infer 函数的人类可读依据（用于 provenance note）。 */
const INFER_NOTE: Record<MetricKey, string> = {
  contentBrandFit: "按垂类 / KSP 关键词推断",
  targetAudienceOverlap: "按受众年龄 / 垂类推断",
  nigeriaLocalAudience: "按本地受众占比分段推断",
  accountAuthenticity: "按高粉低播 / 异常互动率推断",
  kolTypeGrade: "按粉丝量级 Tier 推断",
  collabReputation: "按是否有品牌合作 / 合作费推断",
  outputStability: "按发布频率 / 是否有播放数据推断",
  competitorConflict: "默认无冲突（无竞品绑定信号）",
};

/**
 * scoreKOC —— 8 维加权综合评分 + 等级判定 + 风险标记。
 * 纯函数：传 koc（可含 aiJudgment 已写入的 ai 指标值）→ 返回 ScoreResult。
 *
 * provenance 规则：
 *  - 若 koc 上的指标字段是用户/CSV 提供且能被 metricScore 识别 → "user"
 *  - 否则 → "inferred"
 *  - 若该 koc 有 AI 评判且 aiMetricOverrides 命中 → "ai"
 */
export function scoreKOC(
  koc: Koc,
  aiMetricOverrides?: Partial<Record<MetricKey, { value: number; note?: string }>>
): ScoreResult {
  const risks = [...(koc.manualRisks || [])];
  const failReasons: string[] = [];
  const avgViews = koc.avgViews || koc.reelsAvg || koc.actViews || 0;
  const engRate = koc.engagementRate || 0;
  const localAudience = getLocalAudienceScore(koc);

  const inferred: Record<MetricKey, number> = {
    contentBrandFit: inferContentBrandFit(koc),
    targetAudienceOverlap: inferTargetAudienceOverlap(koc),
    nigeriaLocalAudience: localAudience,
    accountAuthenticity: inferAccountAuthenticity(koc, avgViews, engRate),
    kolTypeGrade: inferKOLTypeGrade(koc),
    collabReputation: inferCollabReputation(koc),
    outputStability: inferOutputStability(koc, avgViews),
    competitorConflict: inferCompetitorConflict(koc),
  };

  const userValues: Record<MetricKey, unknown> = {
    contentBrandFit: koc.contentBrandFit,
    targetAudienceOverlap: koc.targetAudienceOverlap,
    nigeriaLocalAudience: koc.nigeriaLocalAudience,
    accountAuthenticity: koc.accountAuthenticity,
    kolTypeGrade: koc.kolTypeGrade,
    collabReputation: koc.collabReputation,
    outputStability: koc.outputStability,
    competitorConflict: koc.competitorConflict,
  };

  const scoring = {} as Record<MetricKey, MetricResult>;
  for (const key of METRIC_KEYS) {
    const ai = aiMetricOverrides?.[key];
    if (ai && Number.isFinite(ai.value)) {
      scoring[key] = { value: clampScore(ai.value), provenance: "ai", note: ai.note || "AI 评判" };
      continue;
    }
    const ms = metricScore(userValues[key], inferred[key]);
    scoring[key] = ms.fromUser
      ? { value: ms.value, provenance: "user", note: "用户/CSV 提供" }
      : { value: ms.value, provenance: "inferred", note: INFER_NOTE[key] };
  }

  let score = METRIC_KEYS.reduce(
    (sum, key) => sum + (scoring[key].value / 10) * METRIC_META[key].weight,
    0
  );

  if (koc.followers > 10000 && avgViews > 0 && avgViews < 500) risks.push("疑似买粉（高粉低播）");
  if (engRate > 0 && engRate < 1) risks.push("互动数据异常低");
  if (scoring.accountAuthenticity.value <= 3) failReasons.push("账号真实性低");
  if (scoring.competitorConflict.value <= 3) failReasons.push("竞品绑定 / 独家冲突");
  if (scoring.targetAudienceOverlap.value <= 3) failReasons.push("受众不匹配");
  if (String(koc.remark || "").trim()) risks.push(String(koc.remark).trim());

  score = Math.round(Math.min(100, Math.max(0, score)));

  let entryGrade: EntryGrade;
  let verdict: string;
  let status: ScoreResult["status"];
  if (failReasons.length || score < 50) {
    entryGrade = "不入库";
    verdict = "不入库";
    status = "fail";
    if (!failReasons.length) failReasons.push("综合评分低于 50");
  } else if (score >= 80 && risks.length === 0) {
    entryGrade = "A";
    verdict = "A 级 · 优先合作";
    status = "pass";
  } else if (score >= 65) {
    entryGrade = "B";
    verdict = "B 级 · 观察合作";
    status = risks.length ? "risk" : "pass";
  } else {
    entryGrade = "C";
    verdict = "C 级 · 备用池";
    status = "risk";
  }

  return { score, verdict, status, entryGrade, failReasons, risks, scoring };
}

/** 把 ScoreResult 合并回 koc（保留其它字段）。AI 指标覆盖由调用方按需走 scoreKOC。 */
export function applyScore(koc: Koc): Koc {
  const res = scoreKOC(koc);
  return {
    ...koc,
    score: res.score,
    verdict: res.verdict,
    status: res.status,
    entryGrade: res.entryGrade,
    failReasons: res.failReasons,
    risks: res.risks,
    scoring: res.scoring,
  };
}
