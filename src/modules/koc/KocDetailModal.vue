<script setup lang="ts">
import { computed, ref } from "vue";
import { useKocStore } from "./useKocStore";
import { METRIC_META, METRIC_KEYS } from "./types";
import type { Koc, Provenance } from "./types";
import { fmtNum, statusClass } from "./kocUtils";
import { sanitizeHtml } from "../../lib/sanitize";

const props = defineProps<{ kocId: string }>();
const emit = defineEmits<{ close: []; brief: [id: string] }>();
const store = useKocStore();

const k = computed<Koc | undefined>(() => store.kocData.value.find((x) => x.id === props.kocId));
const scriptDraft = ref(k.value?.videoScript || "");

const PROV_LABEL: Record<Provenance, string> = {
  user: "用户填写",
  inferred: "启发式推断",
  ai: "AI 评判",
};

function metricColor(v: number): string {
  return v >= 7 ? "var(--ok)" : v >= 5 ? "var(--gold)" : "var(--vermilion)";
}
function provClass(p: Provenance): string {
  return `prov prov-${p}`;
}

function save() {
  store.saveScript(props.kocId, scriptDraft.value);
}
async function judge() {
  await store.runAiJudge(props.kocId);
}
async function genScript() {
  const s = await store.runScript(props.kocId);
  if (s) scriptDraft.value = s;
}

const aiHtml = computed(() =>
  k.value?.aiJudgment ? sanitizeHtml(k.value.aiJudgment.reasoning.replace(/\n/g, "<br>")) : ""
);
</script>

<template>
  <Teleport to="body">
    <div class="ov" @click="emit('close')">
      <div v-if="k" class="modal" @click.stop>
        <div class="m-head">
          <div>
            <div class="m-title">{{ k.name || k.username }}</div>
            <div class="m-sub">@{{ k.username }} · {{ k.platform }} · {{ fmtNum(k.followers) }} followers</div>
          </div>
          <button class="x" @click="emit('close')">✕</button>
        </div>

        <div class="m-body">
          <!-- 评分头 -->
          <div class="score-head">
            <div class="sh-box">
              <div class="sh-lab">综合评分 / 入库等级</div>
              <div class="sh-val">{{ k.score }} <span class="sh-grade" :class="statusClass(k.status)">{{ k.entryGrade }}</span></div>
            </div>
            <div class="sh-box">
              <div class="sh-lab">AI 定性评判</div>
              <div v-if="k.aiJudgment" class="sh-ai">
                {{ k.aiJudgment.verdict }}<span v-if="k.aiJudgment.fitScore != null"> · {{ k.aiJudgment.fitScore }}分</span>
              </div>
              <button v-else class="mini-btn" :disabled="store.busy.value" @click="judge">🤖 跑 AI 评判</button>
            </div>
          </div>

          <!-- AI 推理 -->
          <div v-if="k.aiJudgment" class="ai-card">
            <div class="sec-t">AI 评判理由 <span class="prov prov-ai">AI</span></div>
            <div class="ai-reason" v-html="aiHtml" />
            <div v-if="k.aiJudgment.risks.length" class="ai-risks">
              <span v-for="(r, i) in k.aiJudgment.risks" :key="i" class="risk-tag">{{ r }}</span>
            </div>
            <button class="mini-btn" :disabled="store.busy.value" @click="judge">重新评判</button>
          </div>

          <!-- 8 维明细 + provenance -->
          <div class="sec-t">评分明细（每项 0-10 · 标注来源）</div>
          <div class="metrics">
            <div v-for="key in METRIC_KEYS" :key="key" class="metric-row">
              <span class="dot" :style="{ background: metricColor(k.scoring?.[key]?.value ?? 5) }" />
              <span class="m-name">{{ METRIC_META[key].label }}</span>
              <span class="m-weight">×{{ METRIC_META[key].weight }}</span>
              <span v-if="k.scoring?.[key]" :class="provClass(k.scoring[key].provenance)" :title="k.scoring[key].note">
                {{ PROV_LABEL[k.scoring[key].provenance] }}
              </span>
              <span class="m-val">{{ k.scoring?.[key]?.value.toFixed(1) ?? "-" }}</span>
            </div>
          </div>

          <!-- 风险 / 不通过 -->
          <div v-if="k.risks && k.risks.length" class="block">
            <div class="sec-t">风险标记</div>
            <span v-for="(r, i) in k.risks" :key="i" class="risk-tag">{{ r }}</span>
          </div>
          <div v-if="k.failReasons && k.failReasons.length" class="block">
            <div class="sec-t fail">不通过原因</div>
            <div v-for="(r, i) in k.failReasons" :key="i" class="fail-line">• {{ r }}</div>
          </div>

          <!-- 脚本 -->
          <div class="block">
            <div class="sec-t">📝 定制脚本</div>
            <textarea
              v-model="scriptDraft"
              placeholder="点「生成脚本」让 Claude 写，或手动粘贴…"
              class="script-ta"
            />
            <div class="ta-actions">
              <button class="mini-btn primary" :disabled="store.busy.value" @click="genScript">🤖 生成脚本</button>
              <button class="mini-btn" @click="save">💾 保存脚本</button>
            </div>
          </div>

          <!-- 事件日志 -->
          <div class="block">
            <div class="sec-t">事件日志</div>
            <div v-if="(k.events || []).length" class="events">
              <div v-for="ev in k.events" :key="ev.id" class="ev-row">
                <span class="ev-kind">{{ ev.kind }}</span>
                <span class="ev-title">{{ ev.title }}</span>
                <span class="ev-at">{{ new Date(ev.at).toLocaleString("zh-CN") }}</span>
              </div>
            </div>
            <div v-else class="muted">暂无事件</div>
          </div>

          <div class="m-foot">
            <button v-if="k.status !== 'fail'" class="mini-btn primary" @click="emit('brief', k.id)">生成 Brief</button>
            <button class="mini-btn" @click="emit('close')">关闭</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ov {
  position: fixed;
  inset: 0;
  z-index: 420;
  background: var(--overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.modal {
  width: min(680px, 96vw);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.m-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--border-soft);
}
.m-title {
  font-family: var(--serif);
  font-size: 17px;
  font-weight: 600;
  color: var(--ink);
}
.m-sub {
  font-size: 11.5px;
  color: var(--muted);
  margin-top: 2px;
}
.x {
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 16px;
  width: 28px;
  height: 28px;
  border-radius: 7px;
}
.x:hover {
  background: var(--selection-bg);
}
.m-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 20px 20px;
}
.score-head {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 14px;
}
.sh-box {
  background: var(--bg-soft);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 12px 14px;
}
.sh-lab {
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 4px;
}
.sh-val {
  font-family: var(--mono);
  font-size: 26px;
  font-weight: 700;
  color: var(--primary-deep);
}
.sh-grade {
  font-size: 12px;
  padding: 2px 9px;
  border-radius: 999px;
  vertical-align: middle;
  margin-left: 6px;
}
.sh-ai {
  font-size: 20px;
  font-weight: 700;
  color: var(--gold);
}
.ai-card {
  background: var(--primary-soft);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 14px;
}
.ai-reason {
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--text-2);
  margin: 4px 0 8px;
}
.ai-risks {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}
.sec-t {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  margin-bottom: 8px;
}
.sec-t.fail {
  color: var(--vermilion);
}
.metrics {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 14px;
}
.metric-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.m-name {
  color: var(--text);
}
.m-weight {
  font-size: 10px;
  color: var(--dim);
  font-family: var(--mono);
}
.prov {
  font-size: 9.5px;
  padding: 1px 7px;
  border-radius: 999px;
  margin-left: auto;
}
.prov-user {
  background: var(--ok-soft);
  color: var(--ok);
}
.prov-inferred {
  background: var(--bg-soft);
  color: var(--muted);
  border: 1px solid var(--border-soft);
}
.prov-ai {
  background: var(--primary-soft);
  color: var(--primary-deep);
}
.m-val {
  font-family: var(--mono);
  font-weight: 700;
  min-width: 30px;
  text-align: right;
  color: var(--text);
}
.block {
  margin-bottom: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--border-soft);
}
.risk-tag {
  display: inline-block;
  font-size: 10px;
  background: var(--vermilion-soft);
  color: var(--vermilion);
  padding: 2px 7px;
  border-radius: 5px;
  margin: 1px;
}
.fail-line {
  font-size: 12px;
  color: var(--vermilion);
  padding: 2px 0;
}
.script-ta {
  width: 100%;
  min-height: 150px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.6;
  background: var(--bg-soft);
  color: var(--text);
  resize: vertical;
  font-family: var(--mono);
}
.ta-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.events {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.ev-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
}
.ev-kind {
  font-family: var(--mono);
  font-size: 10px;
  background: var(--bg-soft);
  border: 1px solid var(--border-soft);
  border-radius: 5px;
  padding: 1px 6px;
  color: var(--muted);
}
.ev-title {
  color: var(--text-2);
}
.ev-at {
  margin-left: auto;
  font-size: 10px;
  color: var(--dim);
  font-family: var(--mono);
}
.muted {
  font-size: 11.5px;
  color: var(--dim);
}
.m-foot {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--border-soft);
}
.mini-btn {
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--text-2);
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 8px;
}
.mini-btn:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
}
.mini-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.mini-btn.primary {
  background: var(--btn-solid-bg);
  color: var(--btn-solid-text);
  border-color: transparent;
}
.st-pass {
  background: var(--ok-soft);
  color: var(--ok);
}
.st-risk {
  background: var(--vermilion-soft);
  color: var(--gold);
}
.st-fail {
  background: var(--vermilion-soft);
  color: var(--vermilion);
}
.st-pending {
  background: var(--bg-soft);
  color: var(--muted);
}
</style>
