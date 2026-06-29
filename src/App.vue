<script setup lang="ts">
import {
  computed,
  ref,
  watch,
  onMounted,
  onBeforeUnmount,
  defineAsyncComponent,
} from "vue";
// ── 常驻 / 首屏关键：静态导入 ──
import TopNav from "./components/TopNav.vue";
import SplashScreen from "./components/SplashScreen.vue";
import Onboarding from "./components/Onboarding.vue";
import EnvDoctor from "./components/EnvDoctor.vue"; // 既是设置项也是启动 env 网关，留静态
import UpdateBanner from "./components/UpdateBanner.vue";
import ToastHost from "./components/ToastHost.vue";
import VoiceOverlay from "./components/VoiceOverlay.vue";
import CommandPalette from "./components/CommandPalette.vue";
import { useHotkeys } from "./composables/useHotkeys";
import { installMarkdownDelegation } from "./lib/markdown";
import { openUrl, onWsStatus, isTauri } from "./tauri";
// ── 重 / 非首屏：懒加载 ──
const SettingsHub = defineAsyncComponent(() => import("./components/SettingsHub.vue"));
const AddProviderModal = defineAsyncComponent(() => import("./components/AddProviderModal.vue"));
const WorkflowPackModal = defineAsyncComponent(() => import("./components/WorkflowPackModal.vue"));
const AutomationModal = defineAsyncComponent(() => import("./components/AutomationModal.vue"));
const UsageBoard = defineAsyncComponent(() => import("./components/UsageBoard.vue"));
// 三个营销应用场景：直接内嵌桌面原版 HTML 模板（public/tools/*.html），iframe 加载，
// 保证「与模板 1:1 一模一样的效果」。首次切到才挂载，之后 v-show 保活。
const TOOL_SRC: Record<string, string> = {
  koc: "tools/koc.html",
  competitive: "tools/competitive.html",
  pmkt: "tools/pmkt.html",
};

import { checkForUpdate } from "./composables/useUpdater";
import { useAppStore } from "./stores/app";
import { useProvidersStore } from "./stores/providers";
import { useChatStore } from "./stores/chat";
import { useWorkflowsStore } from "./stores/workflows";
import { useAutomationStore } from "./stores/automation";

const app = useAppStore();
const providers = useProvidersStore();
const chatStore = useChatStore();
const workflows = useWorkflowsStore();
const automation = useAutomationStore();

// 当前 tab → 对应模板 HTML。单 iframe 直接随 tab 切换 src，零保活、零中间层，切了必生效。
const frameSrc = computed(() => TOOL_SRC[app.moduleTab] ?? TOOL_SRC.koc);

// ─────────── 应用级生命周期 ───────────
let unMdDelegate: (() => void) | null = null;
let unWsStatus: (() => void) | null = null;
let trimTimer: number | undefined;
onMounted(() => {
  chatStore.init();
  // markdown 区域事件委托(代码复制/展开/外链系统浏览器打开)
  unMdDelegate = installMarkdownDelegation(document, (url) => {
    openUrl(url).catch(() => {});
  });
  // Docker/Web 模式断线提示
  if (!isTauri) unWsStatus = onWsStatus((ok) => (wsDown.value = !ok));
  document.addEventListener("visibilitychange", onVisibilityTrim);
  trimTimer = window.setInterval(() => {
    try {
      chatStore.trimMemory?.();
    } catch {
      /* 收回失败不影响运行 */
    }
  }, 5 * 60 * 1000);
});
function onVisibilityTrim() {
  if (document.visibilityState === "hidden") chatStore.trimMemory();
}
onBeforeUnmount(() => {
  unMdDelegate?.();
  unWsStatus?.();
  if (trimTimer !== undefined) clearInterval(trimTimer);
  window.removeEventListener("mousemove", onAuroraPointer);
  document.removeEventListener("visibilitychange", onVisibilityTrim);
  if (edgeRaf) cancelAnimationFrame(edgeRaf);
});

// ─────────── 极光主题：彩虹边框高光跟随鼠标 ───────────
let mainEl: HTMLElement | null = null;
let edgeRaf = 0;
let edgePx = 0;
let edgePy = 0;
function flushEdge() {
  edgeRaf = 0;
  mainEl ||= document.querySelector(".content");
  if (!mainEl) return;
  const r = mainEl.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const deg = (Math.atan2(edgePy - cy, edgePx - cx) * 180) / Math.PI + 90;
  mainEl.style.setProperty("--edge-angle", `${deg.toFixed(1)}deg`);
}
function onAuroraPointer(e: MouseEvent) {
  edgePx = e.clientX;
  edgePy = e.clientY;
  if (!edgeRaf) edgeRaf = requestAnimationFrame(flushEdge);
}
const isAurora = computed(
  () => app.theme === "aurora-light" || app.theme === "aurora-dark"
);
watch(
  isAurora,
  (on) => {
    if (on) {
      window.addEventListener("mousemove", onAuroraPointer, { passive: true });
    } else {
      window.removeEventListener("mousemove", onAuroraPointer);
      if (edgeRaf) {
        cancelAnimationFrame(edgeRaf);
        edgeRaf = 0;
      }
    }
  },
  { immediate: true }
);

// 全局快捷键
useHotkeys();

const wsDown = ref(false);

// 启动流程：splash → onboarding(仅首次) → env(健康则无感放行) → ready
const ONBOARDED_KEY = "polaris.onboarded.v1";
const phase = ref<"splash" | "onboarding" | "env" | "ready">("splash");

function onSplashDone() {
  const done = localStorage.getItem(ONBOARDED_KEY);
  phase.value = done ? "env" : "onboarding";
}
function onOnboardingDone() {
  phase.value = "env";
}
function onEnvDone() {
  phase.value = "ready";
  checkForUpdate();
}
</script>

<template>
  <div class="shell">
    <!-- 极光琉璃画框主题 -->
    <template v-if="app.theme === 'aurora-light' || app.theme === 'aurora-dark'">
      <div class="aurora" aria-hidden="true">
        <span class="a1"></span><span class="a2"></span><span class="a3"></span><span class="a4"></span><span class="a5"></span>
      </div>
      <div class="grain" aria-hidden="true"></div>
    </template>

    <TopNav />

    <main class="content">
      <!-- 三个营销工具：单 iframe 直接内嵌桌面原版 HTML 模板，src 随 tab 切换，效果与模板完全一致 -->
      <iframe class="tpl-frame" :src="frameSrc" title="营销工具模板"></iframe>
    </main>

    <!-- 自动更新提示条 -->
    <UpdateBanner />

    <!-- 全局 toast + 语音浮层 + 命令面板 -->
    <ToastHost />
    <VoiceOverlay />
    <CommandPalette />

    <!-- Docker/Web 模式断线提示 -->
    <div v-if="wsDown" class="ws-down">连接已断开,正在自动重连…</div>

    <!-- 设置 / 更多 overlay -->
    <SettingsHub v-if="app.settingsOpen" />

    <!-- 共享弹层（供 ChatPanel / 自动化 / 供应商使用） -->
    <AddProviderModal v-if="providers.showAddModal" />
    <WorkflowPackModal v-if="workflows.editorOpen" />
    <AutomationModal v-if="automation.editorOpen" />
    <UsageBoard v-if="providers.showUsageBoard" />

    <!-- 启动流程覆盖层 -->
    <Transition name="splash-fade">
      <SplashScreen v-if="phase === 'splash'" @done="onSplashDone" />
    </Transition>
    <Transition name="onboard-fade">
      <Onboarding v-if="phase === 'onboarding'" @done="onOnboardingDone" />
    </Transition>
    <Transition name="onboard-fade">
      <EnvDoctor v-if="phase === 'env'" gate @done="onEnvDone" />
    </Transition>
  </div>
</template>

<style scoped>
.shell {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-side);
  border-radius: 12px;
  overflow: hidden;
}
.content {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  background: var(--bg-chat);
  margin: 8px;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  box-shadow: var(--shadow);
}
/* 对话模块两栏：左对话主区(flex) + 右看板(固定) */
.chat-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  min-height: 0;
}
.chat-main {
  flex: 1 1 auto;
  min-width: 0;
}
/* 三个营销模块：铺满内容区 */
.mod-host {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.tpl-frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: #fff;
}
/* Docker/Web 模式 WS 断线提示条 */
.ws-down {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9998;
  padding: 4px 16px;
  border-radius: 0 0 9px 9px;
  background: var(--vermilion);
  color: #fff;
  font-size: 12px;
  letter-spacing: 0.5px;
  box-shadow: var(--shadow-lg);
}
</style>

<!-- 非 scoped：Transition 类名需作用在子组件根元素上 -->
<style>
.splash-fade-leave-active {
  transition: opacity 0.8s ease;
}
.splash-fade-leave-to {
  opacity: 0;
}
.onboard-fade-enter-active {
  transition: opacity 0.4s ease;
}
.onboard-fade-leave-active {
  transition: opacity 0.45s ease;
}
.onboard-fade-enter-from,
.onboard-fade-leave-to {
  opacity: 0;
}
</style>
