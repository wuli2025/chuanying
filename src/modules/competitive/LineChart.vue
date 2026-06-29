<script setup lang="ts">
/**
 * 轻量内联 SVG 折线图 —— 替代参考版的 Chart.js（本仓库不装新依赖）。
 * 支持单线(T1，带逐点高亮 markers)与多线(T2，带图例)。坐标轴/网格走主题 token。
 */
import { computed } from "vue";

interface Series {
  name?: string;
  color: string;
  data: number[];
  /** 每点颜色（仅单线 T1 用于高亮拐点）。 */
  markers?: string[];
}

const props = withDefaults(
  defineProps<{
    labels: string[];
    series: Series[];
    /** Y 轴单位后缀，如 "%"。 */
    unit?: string;
    /** 是否显示图例（多线时）。 */
    legend?: boolean;
    height?: number;
  }>(),
  { unit: "", legend: false, height: 240 }
);

const W = 640;
const PAD_L = 38;
const PAD_R = 14;
const PAD_T = 14;
const PAD_B = 26;

const H = computed(() => props.height);
const plotW = computed(() => W - PAD_L - PAD_R);
const plotH = computed(() => H.value - PAD_T - PAD_B);

const allVals = computed(() => props.series.flatMap((s) => s.data).filter((n) => Number.isFinite(n)));
const rawMax = computed(() => (allVals.value.length ? Math.max(...allVals.value) : 1));
const rawMin = computed(() => (allVals.value.length ? Math.min(...allVals.value) : 0));
/** 上下各留点余量，最小从 0 起。 */
const yMax = computed(() => {
  const m = rawMax.value;
  const step = niceStep((m - Math.min(0, rawMin.value)) / 4);
  return Math.ceil(m / step) * step || 1;
});
const yMin = computed(() => {
  if (rawMin.value >= 0) return 0;
  const step = niceStep((rawMax.value - rawMin.value) / 4);
  return Math.floor(rawMin.value / step) * step;
});

function niceStep(rough: number): number {
  if (rough <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / pow;
  const nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return nice * pow;
}

const yTicks = computed(() => {
  const ticks: number[] = [];
  const span = yMax.value - yMin.value || 1;
  const step = niceStep(span / 4);
  for (let v = yMin.value; v <= yMax.value + 1e-6; v += step) ticks.push(Number(v.toFixed(4)));
  return ticks;
});

function xAt(i: number): number {
  const n = props.labels.length;
  if (n <= 1) return PAD_L + plotW.value / 2;
  return PAD_L + (plotW.value * i) / (n - 1);
}
function yAt(v: number): number {
  const span = yMax.value - yMin.value || 1;
  return PAD_T + plotH.value * (1 - (v - yMin.value) / span);
}

const polylines = computed(() =>
  props.series.map((s) => ({
    color: s.color,
    name: s.name,
    points: s.data.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" "),
    dots: s.data.map((v, i) => ({
      x: xAt(i),
      y: yAt(v),
      c: s.markers?.[i] ?? s.color,
    })),
  }))
);

function fmtTick(v: number): string {
  const s = Number.isInteger(v) ? String(v) : v.toFixed(1);
  return s + props.unit;
}
</script>

<template>
  <div class="lc">
    <svg :viewBox="`0 0 ${W} ${H}`" :style="{ height: H + 'px' }" preserveAspectRatio="none" class="lc-svg">
      <!-- 网格 + Y 轴刻度 -->
      <g class="lc-grid">
        <template v-for="(t, i) in yTicks" :key="'y' + i">
          <line :x1="PAD_L" :x2="W - PAD_R" :y1="yAt(t)" :y2="yAt(t)" />
          <text :x="PAD_L - 6" :y="yAt(t) + 3" text-anchor="end">{{ fmtTick(t) }}</text>
        </template>
      </g>
      <!-- X 轴标签 -->
      <g class="lc-xlab">
        <text v-for="(lb, i) in labels" :key="'x' + i" :x="xAt(i)" :y="H - 8" text-anchor="middle">{{ lb }}</text>
      </g>
      <!-- 折线 + 点 -->
      <g v-for="(pl, si) in polylines" :key="'s' + si">
        <polyline :points="pl.points" fill="none" :stroke="pl.color" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" />
        <circle v-for="(d, di) in pl.dots" :key="'d' + di" :cx="d.x" :cy="d.y" r="3.6" :fill="d.c" stroke="var(--panel)" stroke-width="1.4">
          <title>{{ (pl.name ? pl.name + ' · ' : '') + labels[di] + ': ' + series[si].data[di] + unit }}</title>
        </circle>
      </g>
    </svg>
    <div v-if="legend && series.length > 1" class="lc-legend">
      <span v-for="(s, i) in series" :key="'l' + i" class="lc-leg">
        <i :style="{ background: s.color }" />{{ s.name }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.lc {
  width: 100%;
}
.lc-svg {
  width: 100%;
  display: block;
}
.lc-grid line {
  stroke: var(--border-soft);
  stroke-width: 1;
}
.lc-grid text {
  fill: var(--dim);
  font-size: 10px;
  font-family: var(--mono);
}
.lc-xlab text {
  fill: var(--muted);
  font-size: 10px;
}
.lc-legend {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 8px;
}
.lc-leg {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--muted);
}
.lc-leg i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}
</style>
