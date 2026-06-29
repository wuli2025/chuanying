<script setup lang="ts">
/**
 * KocModule —— Infinix Hot 70 校园 KOC 筛选工作流（4 阶段）。
 *
 * 两栏布局贴合新壳：
 *  LEFT  = Agent Console：4 阶段导航 + Claude 实时流式日志（onDelta/onTool）
 *          + run-status + 采集/评判 RUN 历史（「AI 跑了什么看得见」）。
 *  RIGHT = Dashboard：当前阶段的富数据视图（Brief 表单 / 录入 / 15 列筛选表 / 追踪表）。
 *
 * 全部状态由 useKocStore 持久化到 localStorage（chuanying.koc.*）。
 */
import { ref, computed, nextTick, watch } from "vue";
import { useKocStore } from "./useKocStore";
import { STAGE_LABELS } from "./types";
import type { StageNo } from "./types";
import StageBrief from "./StageBrief.vue";
import StageKoc from "./StageKoc.vue";
import StageScreening from "./StageScreening.vue";
import StageTracking from "./StageTracking.vue";
import KocDetailModal from "./KocDetailModal.vue";

const store = useKocStore();
const stage = ref<StageNo>(1);
const detailId = ref<string | null>(null);

const logEl = ref<HTMLElement | null>(null);
watch(
  () => store.consoleLines.value.length,
  async () => {
    await nextTick();
    if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight;
  }
);

function goStage(s: StageNo) {
  stage.value = s;
}
function openDetail(id: string) {
  detailId.value = id;
}
function genBrief(id: string) {
  store.generateBrief(id);
  stage.value = 1;
}

const stages: StageNo[] = [1, 2, 3, 4];
function lineClass(kind: string): string {
  return `ln ln-${kind}`;
}
function fmtTime(at: number): string {
  return new Date(at).toLocaleTimeString("zh-CN", { hour12: false });
}
const recentRuns = computed(() => store.runs.value.slice(0, 8));
</script>

<template>
  <div class="koc">
    <!-- LEFT: Agent Console -->
    <aside class="console">
      <div class="brand">
        <span class="logo">INFINIX</span>
        <span class="ttl">Hot 70 · KOC 筛选</span>
      </div>

      <nav class="nav">
        <button
          v-for="s in stages"
          :key="s"
          class="nav-item"
          :class="{ on: stage === s }"
          @click="goStage(s)"
        >
          <span class="step">{{ s }}</span>
          <span>{{ STAGE_LABELS[s] }}</span>
        </button>
      </nav>

      <div class="status-bar" :class="{ busy: store.busy.value }">
        <span class="dot" />
        <span class="txt">{{ store.runStatus.value || (store.busy.value ? "Claude 运行中…" : "空闲") }}</span>
      </div>

      <div class="log-head">
        <span>实时日志 · AI 跑了什么</span>
        <button class="clr" @click="store.clearConsole()">清空</button>
      </div>
      <div ref="logEl" class="log">
        <div v-if="store.consoleLines.value.length === 0" class="log-empty">
          采集 / AI 评判 / 脚本生成时，Claude 的流式输出与工具调用会在这里实时显示。
        </div>
        <div v-for="(l, i) in store.consoleLines.value" :key="i" :class="lineClass(l.kind)">
          <span class="lt">{{ fmtTime(l.at) }}</span>
          <span class="lx">{{ l.text }}</span>
        </div>
      </div>

      <div class="runs-head">采集 / 评判记录（{{ store.runs.value.length }}）</div>
      <div class="runs">
        <div v-if="recentRuns.length === 0" class="log-empty small">暂无 RUN 记录</div>
        <div v-for="r in recentRuns" :key="r.id" class="run">
          <span class="run-kind" :class="r.kind">{{ r.kind }}</span>
          <div class="run-body">
            <div class="run-sum">{{ r.resultSummary }}</div>
            <div class="run-in">{{ r.inputSummary }}</div>
            <div class="run-meta">{{ fmtTime(r.at) }} · {{ r.tools.length }} 个工具调用</div>
          </div>
        </div>
      </div>
    </aside>

    <!-- RIGHT: Dashboard -->
    <main class="dash">
      <StageBrief v-if="stage === 1" />
      <StageKoc v-else-if="stage === 2" />
      <StageScreening v-else-if="stage === 3" @detail="openDetail" @brief="genBrief" />
      <StageTracking v-else-if="stage === 4" />
    </main>

    <KocDetailModal
      v-if="detailId"
      :koc-id="detailId"
      @close="detailId = null"
      @brief="(id) => { genBrief(id); detailId = null; }"
    />
  </div>
</template>

<style scoped>
.koc {
  display: grid;
  grid-template-columns: 320px 1fr;
  height: 100%;
  min-height: 0;
  background: var(--bg);
  color: var(--text);
}

/* ── LEFT console ── */
.console {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid var(--border);
  background: var(--bg-side);
  padding: 16px 14px;
  gap: 12px;
}
.brand {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.logo {
  font-weight: 800;
  font-size: 16px;
  letter-spacing: 0.5px;
  color: var(--ink);
}
.ttl {
  font-size: 12px;
  color: var(--muted);
}
.nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-2);
  font-size: 13px;
  padding: 8px 10px;
  border-radius: 10px;
  text-align: left;
}
.nav-item:hover {
  background: var(--panel-hover);
}
.nav-item.on {
  background: var(--primary);
  color: #fff;
  font-weight: 500;
}
.step {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--panel);
  color: var(--text-2);
  font-size: 12px;
  font-weight: 700;
}
.nav-item.on .step {
  background: #fff;
  color: var(--primary);
}
.status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--panel);
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--text-2);
}
.status-bar .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--dim);
  flex-shrink: 0;
}
.status-bar.busy .dot {
  background: var(--ok);
  animation: pulse 1.1s ease-in-out infinite;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}
.status-bar .txt {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.log-head,
.runs-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.clr {
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 11px;
  text-transform: none;
}
.clr:hover {
  color: var(--primary);
}
.log {
  flex: 1;
  min-height: 120px;
  overflow-y: auto;
  background: var(--panel);
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  padding: 8px;
  font-family: var(--mono);
  font-size: 11px;
  line-height: 1.55;
}
.log-empty {
  color: var(--dim);
  font-family: var(--sans);
  font-size: 11.5px;
  padding: 6px;
  line-height: 1.6;
}
.log-empty.small {
  padding: 4px 0;
}
.ln {
  display: flex;
  gap: 6px;
  padding: 1px 0;
}
.lt {
  color: var(--dim);
  flex-shrink: 0;
}
.lx {
  color: var(--text-2);
  word-break: break-word;
  white-space: pre-wrap;
}
.ln-tool .lx {
  color: var(--primary);
}
.ln-ok .lx {
  color: var(--ok);
}
.ln-error .lx {
  color: var(--vermilion);
}
.ln-info .lx {
  color: var(--gold);
}
.runs {
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.run {
  display: flex;
  gap: 8px;
  background: var(--panel);
  border: 1px solid var(--border-soft);
  border-radius: 9px;
  padding: 7px 9px;
}
.run-kind {
  font-size: 9.5px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 5px;
  height: fit-content;
  text-transform: uppercase;
}
.run-kind.collect {
  background: var(--primary-soft);
  color: var(--primary-deep);
}
.run-kind.judge {
  background: var(--ok-soft);
  color: var(--ok);
}
.run-kind.score {
  background: var(--bg-soft);
  color: var(--muted);
}
.run-body {
  min-width: 0;
}
.run-sum {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text);
}
.run-in {
  font-size: 10.5px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
}
.run-meta {
  font-size: 9.5px;
  color: var(--dim);
  font-family: var(--mono);
  margin-top: 1px;
}

/* ── RIGHT dashboard ── */
.dash {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 22px 26px 32px;
}

@media (max-width: 880px) {
  .koc {
    grid-template-columns: 1fr;
  }
  .console {
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
}
</style>
