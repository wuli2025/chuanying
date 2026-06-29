<script setup lang="ts">
import { computed } from "vue";
import { useKocStore } from "./useKocStore";
import type { Koc, Brief } from "./types";
import { briefToText, downloadFile, statusClass } from "./kocUtils";
import { sanitizeHtml } from "../../lib/sanitize";

const store = useKocStore();

const entries = computed<{ brief: Brief; koc: Koc | undefined }[]>(() =>
  Object.values(store.briefs.value).map((b) => ({
    brief: b,
    koc: store.kocData.value.find((k) => k.id === b.kocId),
  }))
);

function copy(b: Brief, k?: Koc) {
  if (!k) return;
  navigator.clipboard?.writeText(briefToText(b, k));
}
function exportAll() {
  const txt = entries.value
    .filter((e) => e.koc)
    .map((e) => briefToText(e.brief, e.koc as Koc))
    .join("\n\n========================================\n\n");
  if (txt) downloadFile("infinix_hot70_koc_briefs.txt", txt, "text/plain");
}
function scriptHtml(s?: string): string {
  return s ? sanitizeHtml(s.replace(/\n/g, "<br>")) : "";
}
</script>

<template>
  <div class="bl">
    <div class="bl-head">
      <span class="t">已生成的定制 Brief（{{ entries.length }}）</span>
      <button v-if="entries.length" class="btn" @click="exportAll">⬇️ 导出全部</button>
    </div>

    <div v-if="entries.length === 0" class="empty">
      暂无 Brief · 在「筛选结果」点 KOC 的 Brief 按钮生成
    </div>

    <div v-for="e in entries" :key="e.brief.kocId" class="brief-card">
      <div class="bc-head">
        <div>
          <div class="bc-title">{{ e.brief.content.title }}</div>
          <div class="bc-sub">{{ e.brief.content.platform }} · {{ e.brief.content.scoreLine }} · {{ e.brief.content.kocFit.category }}</div>
        </div>
        <span v-if="e.koc" class="badge" :class="statusClass(e.koc.status)">{{ e.koc.verdict }}</span>
      </div>

      <div class="sec">
        <div class="sec-t">产品信息</div>
        <div class="box">
          <div><b>产品：</b>{{ e.brief.content.product.name }}</div>
          <div><b>核心卖点：</b>{{ e.brief.content.product.sellingPoint }}</div>
          <div><b>售价：</b>{{ e.brief.content.product.price }}</div>
          <div><b>目标人群：</b>{{ e.brief.content.product.targetAudience }}</div>
        </div>
      </div>

      <div class="sec">
        <div class="sec-t">内容方向</div>
        <div v-for="(d, i) in e.brief.content.contentDirections" :key="i" class="dir">
          <span class="num">{{ i + 1 }}</span>
          <div><b>{{ d.title }}</b><div class="dim">{{ d.desc }}</div></div>
        </div>
        <div class="box warn">竞品对比话术：{{ e.brief.content.competitorLine }}</div>
        <div class="tags">
          <span v-for="t in e.brief.content.contentFormats" :key="t" class="tag">{{ t }}</span>
          <span v-for="t in e.brief.content.avoid" :key="t" class="tag bad">{{ t }}</span>
        </div>
      </div>

      <div class="sec">
        <div class="sec-t">合作条款</div>
        <div class="box">
          <div><b>合作形式：</b>{{ e.brief.content.terms.collaboration }}</div>
          <div><b>交付：</b>{{ e.brief.content.terms.deliverable }}</div>
          <div><b>必须标注：</b>{{ e.brief.content.terms.requiredTags.join(" · ") }}</div>
        </div>
      </div>

      <div v-if="e.brief.script" class="sec">
        <div class="sec-t">🤖 定制脚本</div>
        <div class="box script" v-html="scriptHtml(e.brief.script)" />
      </div>

      <div class="bc-foot">
        <button class="btn" :disabled="store.busy.value" @click="store.runScript(e.brief.kocId)">🤖 {{ e.brief.script ? "重生成脚本" : "生成脚本" }}</button>
        <button class="btn" @click="copy(e.brief, e.koc)">📋 复制 Brief</button>
        <button class="btn danger" @click="store.deleteBrief(e.brief.kocId)">删除</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bl { display: flex; flex-direction: column; gap: 12px; }
.bl-head { display: flex; align-items: center; justify-content: space-between; }
.bl-head .t { font-size: 13px; font-weight: 600; color: var(--text-2); }
.btn { border: 1px solid var(--border); background: var(--panel); color: var(--text-2); font-size: 12px; padding: 5px 11px; border-radius: 8px; }
.btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn.danger { color: var(--vermilion); }
.empty { text-align: center; padding: 28px; color: var(--dim); font-size: 12.5px; }
.brief-card { background: var(--panel); border: 1px solid var(--border); border-radius: 14px; padding: 18px; box-shadow: var(--shadow-sm); position: relative; overflow: hidden; }
.brief-card::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 4px; background: linear-gradient(90deg, var(--primary), var(--gold), var(--vermilion)); }
.bc-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.bc-title { font-family: var(--serif); font-size: 15px; font-weight: 600; color: var(--ink); }
.bc-sub { font-size: 11px; color: var(--muted); margin-top: 2px; }
.badge { font-size: 10.5px; padding: 2px 9px; border-radius: 999px; font-weight: 600; }
.st-pass { background: var(--ok-soft); color: var(--ok); }
.st-risk { background: var(--vermilion-soft); color: var(--gold); }
.st-fail { background: var(--vermilion-soft); color: var(--vermilion); }
.st-pending { background: var(--bg-soft); color: var(--muted); }
.sec { margin-bottom: 12px; }
.sec-t { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; color: var(--muted); margin-bottom: 6px; }
.box { background: var(--bg-soft); border: 1px solid var(--border-soft); border-radius: 10px; padding: 10px 12px; font-size: 12.5px; line-height: 1.7; color: var(--text-2); }
.box.warn { margin-top: 8px; background: var(--vermilion-soft); }
.box.script { white-space: normal; font-family: var(--mono); font-size: 12px; }
.dir { display: flex; gap: 8px; padding: 5px 0; }
.num { width: 20px; height: 20px; flex-shrink: 0; background: var(--primary-soft); color: var(--primary-deep); font-size: 11px; font-weight: 600; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.dim { font-size: 11.5px; color: var(--muted); margin-top: 2px; }
.tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
.tag { background: var(--primary-soft); color: var(--primary-deep); font-size: 11px; padding: 3px 8px; border-radius: 6px; }
.tag.bad { background: var(--vermilion-soft); color: var(--vermilion); }
.bc-foot { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
</style>
