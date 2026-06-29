<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import { useKocStore } from "./useKocStore";
import BriefList from "./BriefList.vue";
import type { BriefTemplate } from "./types";

const store = useKocStore();
const form = reactive<BriefTemplate>({ ...store.briefTemplate.value });
const savedHint = ref(false);
const docText = ref("");

watch(
  () => store.briefTemplate.value,
  (t) => Object.assign(form, t)
);

function save() {
  store.setBriefTemplate({ ...form });
  savedHint.value = true;
  setTimeout(() => (savedHint.value = false), 2000);
}

async function extract() {
  if (!docText.value.trim()) return;
  await store.runBriefExtract(docText.value);
}

function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    docText.value = String(ev.target?.result || "");
  };
  reader.readAsText(file, "utf-8");
}
</script>

<template>
  <div class="stage">
    <div class="s-head">
      <h2>合作 Brief 模板</h2>
      <p>填写本次 KOC 招募的产品与内容要求；保存后用于评分上下文、AI 评判与脚本生成。</p>
    </div>

    <div class="card">
      <div class="grid2">
        <label class="fg"><span>产品名称</span><input v-model="form.product" /></label>
        <label class="fg"><span>核心卖点 KSP</span><input v-model="form.ksp" /></label>
        <label class="fg"><span>目标人群</span><input v-model="form.audience" /></label>
        <label class="fg"><span>官方售价</span><input v-model="form.price" /></label>
        <label class="fg"><span>合作形式</span><input v-model="form.collabForm" /></label>
        <label class="fg"><span>投流预警播放量</span><input v-model.number="form.boostThreshold" type="number" /></label>
      </div>
      <label class="fg full">
        <span>内容要求 / 脚本方向</span>
        <textarea v-model="form.contentReq" rows="6" />
      </label>
      <div class="actions">
        <button class="btn primary" @click="save">保存 Brief 模板</button>
        <span v-if="savedHint" class="ok-hint">✅ 已保存</span>
      </div>
    </div>

    <div class="card">
      <div class="card-t">📄 上传 / 粘贴 Brief 文档 → Claude 自动抽取字段</div>
      <label class="upload">
        选择文件（txt / md）<input type="file" accept=".txt,.md,.csv" hidden @change="onFile" />
      </label>
      <textarea
        v-model="docText"
        rows="5"
        placeholder="或直接把 Brief 文档内容粘贴到这里…"
        class="doc-ta"
      />
      <div class="actions">
        <button class="btn" :disabled="store.busy.value || !docText.trim()" @click="extract">
          🤖 让 Claude 抽取并填入上表
        </button>
      </div>
    </div>

    <BriefList />
  </div>
</template>

<style scoped>
.stage {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.s-head h2 {
  font-family: var(--serif);
  font-size: 17px;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 4px;
}
.s-head p {
  font-size: 12px;
  color: var(--muted);
  margin: 0;
}
.card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 18px;
  box-shadow: var(--shadow-sm);
}
.card-t {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 12px;
}
.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}
.fg {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.fg.full {
  grid-column: 1 / -1;
}
.fg > span {
  font-size: 11.5px;
  color: var(--text-2);
  font-weight: 500;
}
.fg input,
.fg textarea,
.doc-ta {
  border: 1px solid var(--border);
  border-radius: 9px;
  padding: 7px 10px;
  font-size: 13px;
  background: var(--bg-soft);
  color: var(--text);
  outline: none;
  resize: vertical;
  line-height: 1.6;
}
.fg input:focus,
.fg textarea:focus,
.doc-ta:focus {
  border-color: var(--primary);
}
.doc-ta {
  width: 100%;
  margin: 10px 0;
}
.actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}
.btn {
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--text-2);
  font-size: 12.5px;
  padding: 7px 14px;
  border-radius: 9px;
}
.btn:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn.primary {
  background: var(--btn-solid-bg);
  color: var(--btn-solid-text);
  border-color: transparent;
}
.ok-hint {
  font-size: 12px;
  color: var(--ok);
}
.upload {
  display: inline-block;
  border: 1px dashed var(--border-strong);
  border-radius: 9px;
  padding: 8px 14px;
  font-size: 12.5px;
  color: var(--text-2);
  cursor: pointer;
}
.upload:hover {
  border-color: var(--primary);
  color: var(--primary);
}
</style>
