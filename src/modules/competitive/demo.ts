/**
 * DEMO_A（Anker）/ DEMO_B（OPPO）—— 从参考 HTML 逐字搬运。
 * 双重用途：
 *  (a) 空态演示（尚未真跑时右侧直接铺这份样例）；
 *  (b) prompt 里的 few-shot 范例（拉高模型输出质量、对齐 schema）。
 */
import type { ModeAData, ModeBData } from "./types";

/* ===================== DEMO A : Anker ===================== */
export const DEMO_A: ModeAData = {
  title: "安克创新 Anker · Nano 智能充电器",
  ch1: {
    lead:
      "研发投入（21亿）≈ 纯营销花费（~21亿）——这在消费电子行业极罕见，意味着 Anker 的战略共识是：<b>研发创造差异化，营销将差异化变现</b>，两者是同一<span class='hl'>飞轮</span>的两个轮子。",
    kpis: [
      { v: "247亿", cls: "red", k: "2024总营收", d: "YoY +41.14%", tag: "ok" },
      { v: "55.7亿", cls: "blue", k: "销售费用(原值)", d: "YoY +43.31%", tag: "ok" },
      { v: "~21亿", cls: "amber", k: "纯营销花费", d: "占营收~8.5%", tag: "est" },
      { v: "21.1亿", cls: "green", k: "研发投入", d: "YoY +49.13%,研发占53%", tag: "ok" },
    ],
    rows: [
      { item: "销售费用(年报原值)", amt: "55.70亿", pct: "100%", src: "安克创新2024年报", tag: "ok" },
      { item: "销售人员薪酬", amt: "约-22~25亿", pct: "~42%", src: "DTC典型值40-45%；5,034人员工", tag: "est" },
      { item: "亚马逊等平台服务费", amt: "约-7~9亿", pct: "~14%", src: "年报提及平台费用增加；佣金8-15%", tag: "est" },
      { item: "保修售后准备金", amt: "约-4~5亿", pct: "~8%", src: "DTC品牌典型值6-10%", tag: "est" },
      {
        item: "纯营销花费(广告+推广+KOL)",
        amt: "约20~22亿(≈$3亿)",
        pct: "~36%",
        src: "S&M剥离法,DTC典型35-45%",
        tag: "total",
      },
    ],
    signal:
      "<b>趋势信号：</b>2024销售费用增速(43.3%)略超营收增速(41.1%)，是有意为之的『以投换份额』周期。独立站收入同比增长101%，DTC营销飞轮已现。",
  },
  ch2: {
    lead:
      "杨萌『浅海理论』核心：避开成熟红海，进入增长期细分品类，<b>反向链路设计产品</b>——从真实场景痛点出发倒推研发。",
    theory: {
      title: "杨萌「浅海理论」",
      body:
        "<p>消费电子品类如海洋，<em>市场规模是海域，竞争烈度是水深</em>。</p><p>策略是入驻<em>『浅海』</em>——正在增长、竞争尚未充分的细分品类，以高配置建立类别领导地位。</p><p>当『浅海』成熟变深，『World's First』叙事成为重划类别边界的防御武器。</p>",
    },
    products: [
      {
        ico: "🔌",
        name: "Smart Display Nano Charger 45W",
        pain: "不知充了多少W/电池健康焦虑/过夜担心损坏",
        badge: "红海重新定义",
        bcls: "r",
      },
      {
        ico: "🖥️",
        name: "Desk Clamp Power Strip 70W",
        pain: "升降桌/WFH桌面杂乱、线缆管理差",
        badge: "细分场景切入",
        bcls: "b",
      },
      { ico: "🔋", name: "SOLIX 阳台储能", pain: "欧洲电费高、无门槛户外储能缺失", badge: "新品类开创", bcls: "g" },
    ],
    steps: [
      {
        en: "STEP 01 · PAIN POINT MINING",
        title: "亚马逊差评是最真实的需求文件",
        desc:
          '杨萌：<b>"Amazon reviews are the single most important input to our new product development process."</b> 大规模分析1-2星差评→提取『但是/如果』语句→识别场景缺口。',
        tags: ["亚马逊差评挖掘", "Reddit讨论", "场景拆分:travel/WFH/overnight"],
      },
      {
        en: "STEP 02 · SCENE-DRIVEN R&D",
        title: "场景约束直接转化为研发优先级",
        desc:
          "不是『做更快的充电器』，而是<b>『苹果用户出差只带一个、不怕坏电池的智能充电器』</b>。2024研发人员占53%(2,672人)。",
        tags: ["GaNPrime小型化", "Care Mode", "Smart Display", "ActiveShield 5.0"],
      },
      {
        en: "STEP 03 · TECH → CLAIM TRANSLATION",
        title: '"World\'s First" 是红海里的类别边界重划工具',
        desc:
          "每次迭代都找一个可声称『World's First』的<b>细分维度</b>——不是整体第一，而是类别创造者，让竞品永远是『也有这个功能』的跟随者。",
        tags: ["类别创造者", "防御性叙事", "可声称的细分第一"],
      },
      {
        en: "STEP 04 · PRODUCT PACKAGING",
        title: "用JTBD框架决定卖点的排序逻辑",
        desc:
          "核心不是『列出所有优点』，而是<b>按用户决策路径顺序排列卖点</b>，每个卖点回答下一步要解决的隐性Job。详见第3章。",
        tags: ["JTBD排序", "漏斗式说服链", "卖点≠平铺"],
      },
    ],
  },
  ch3: {
    lead:
      "以 Nano Smart Display Charger 为例。<b>每一层卖点都对应用户决策路径上必须先完成的Job</b>，是漏斗形说服链，不是卖点平铺。",
    def:
      "<b>JTBD：</b>用户购买本质是『雇用』产品完成任务——功能任务(充电)+情绪任务(安全感)+社会任务(身份)。卖点排序应与Job优先级一致：最迫切的Job对应卖点最先出现。",
    sellpoints: [
      {
        rank: "1",
        layer: "卖点层1 · 苹果生态联动",
        headline: '"Perfect Match for iPhone 17/16/15"',
        job: "用户的Job：我是苹果用户，需要懂我设备的配件。",
        why: "苹果用户第一问不是『快不快』而是『这是给我用的吗』。型号识别功能把它变成视觉宣示。",
        voc: "VOC：『苹果全家桶的最佳第三方充电器』— Cult of Mac",
      },
      {
        rank: "2",
        layer: "卖点层2 · 电池安全保护",
        headline: '"TÜV Care Mode — 9°F Cooler"',
        job: "用户的Job：iPhone贵，快充会不会损坏电池？过夜安全吗？",
        why: "情绪阻力最高的节点。三重拆解：TÜV权威+精确数字(9°F)+操作仪式(双击激活)。",
        voc: "VOC：『Care Mode让我真的放心了』— 多位Amazon评测者",
      },
      {
        rank: "3",
        layer: "卖点层3 · 智能充电可视化",
        headline: '"Know More. Guess Less." — 20+ 显示',
        job: "用户的Job：愿为『智能』付费，但需要看见智能。",
        why: "接受智能叙事前必须先解除安全疑虑——Smart Display把智能变成可观察行为，让用户相信钱花对了。",
        voc: "VOC：『本以为是噱头，结果真的有用』— Fstoppers",
      },
      {
        rank: "4",
        layer: "卖点层4 · 多场景便携",
        headline: '"Pack Light. Charge Right." — 47% Smaller',
        job: "用户的Job：差旅/办公充电器太重，想一个通吃。",
        why: "便携是理性诉求，放最后做催化剂。对比苹果原装30W(47%更小)给出替换理由。",
        voc: "VOC：『像是真正常出差的人设计的』— Fstoppers",
      },
    ],
    path: [
      { stage: "进入页面时", q: "这是给我用的吗?", a: "→ 苹果生态联动，建立身份归属" },
      { stage: "感兴趣后", q: "会不会伤我iPhone?", a: "→ TÜV Care Mode，消除最大阻力" },
      { stage: "信任建立后", q: "真智能还是吹牛?", a: "→ Smart Display 视觉验证" },
      { stage: "准备下单前", q: "值得替换吗?", a: "→ 47%更小 vs 苹果原装，给替换理由" },
    ],
  },
  ch4: {
    lead:
      "不是『上架→打广告』的线性逻辑，而是 CES发布(内容起爆)→垂类博主种草→亚马逊全漏斗收割→DTC复购 的精密闭环。",
    funnel: [
      { stg: "A · 认知", en: "AWARENESS", pct: "~35%", bud: "约7~7.5亿/年" },
      { stg: "I · 兴趣", en: "INTEREST", pct: "~30%", bud: "约6~6.5亿/年" },
      { stg: "C · 考量", en: "CONSIDERATION", pct: "~20%", bud: "约4~4.5亿/年" },
      { stg: "P · 转化", en: "PURCHASE", pct: "~15%", bud: "约3~3.5亿/年" },
    ],
    detail: [
      { lbl: "A 认知", text: "<b>CES发布=内容核弹</b>：6大活动产生850万有机播放、10万+亚马逊点击，ROI 10:1。" },
      {
        lbl: "I 兴趣",
        text: "<b>垂类场景Creator</b>：不选泛科技博主，选场景圈博主。SuperChargers自建Creator Program形成内容飞轮。",
      },
      {
        lbl: "C 考量",
        text: "<b>亚马逊全漏斗广告</b>：SP+SB+SD+DSP四层联动，自建Oceanwing运营。A+ Content+4.7星构成社会证明。",
      },
      { lbl: "P 转化", text: "<b>Prime Day/黑五</b>促销引擎(Q3营收+44%)。独立站会员体系是DTC的LTV核心抓手。" },
    ],
    channels: [
      { name: "亚马逊全漏斗广告", pct: 38 },
      { name: "KOL/Creator合作", pct: 22 },
      { name: "Meta/Instagram广告", pct: 15 },
      { name: "独立站DTC运营", pct: 12 },
      { name: "TikTok Shop", pct: 7 },
      { name: "线下零售支持", pct: 6 },
    ],
    weak: {
      title: "官方社媒矩阵偏弱",
      text:
        "Anker品牌声量高度依赖第三方创作者，自有社媒互动率偏低。一旦竞品系统性建立自己的Creator生态，Anker缺少反制能力——这是IMC体系最大漏洞。",
    },
  },
  foot:
    "复刻自『Anker如何赢的·全链路营销体系』· 财报：安克创新2024年报(深交所300866) · ✓确认=财报原值，~估算=S&M剥离/行业经验",
};

/* ===================== DEMO B : OPPO ===================== */
export const DEMO_B: ModeBData = {
  title: "OPPO · 品牌危机数据图鉴",
  subtitle: "『两个老公』事件背后的战略困境 · 2026.05",
  t1_share: {
    title: "中国市场份额走势",
    subtitle: "从霸主到第五，被上下夹击",
    source: "数据源：IDC / Counterpoint",
    chart: {
      labels: ["2018", "2019", "2020", "2021", "2022", "2023Q1", "2024", "2025Q2"],
      data: [12.77, 11, 9, 7, 6.8, 19.6, 8, 17],
      markers: ["#1f9d57", "#1f9d57", "#e5484d", "#e5484d", "#e5484d", "#1f9d57", "#9aa0aa", "#1f9d57"],
    },
    stats: [
      { label: "2018峰值", value: "12.77%", cls: "g" },
      { label: "2023Q1反弹", value: "19.6% #1", cls: "g" },
      { label: "2024全年", value: "~10.5% #5", cls: "r" },
      { label: "2026Q1全球", value: "-9.9% 降幅最大", cls: "r" },
    ],
  },
  t2_premium: {
    title: "高端市场(3000元以上)份额对比",
    subtitle: "OPPO在高端的天花板被华为回归彻底压死",
    source: "趋势示意 · 基于 IDC/Counterpoint",
    chart: {
      labels: ["2022Q1", "2022Q3", "2023Q1", "2023Q3", "2024Q1", "2024Q3", "2025Q1"],
      series: [
        { name: "Apple", color: "#7c5cdb", data: [38, 37, 40, 37, 38, 36, 35] },
        { name: "华为", color: "#e5484d", data: [27, 22, 18, 24, 32, 35, 36] },
        { name: "OPPO", color: "#1f9d57", data: [5, 7, 12, 14, 11, 10, 9] },
      ],
    },
    cards: [
      {
        title: "Find X 系列定位",
        cls: "g",
        items: ["对标华为Mate/P系列", "影像：哈苏联名", "折叠屏Find N系列", "定价5000-9000元"],
      },
      {
        title: "高端化三大障碍",
        cls: "r",
        items: ["华为回归抢走爱国溢价", "苹果iOS生态护城河", "高端品牌感积累不够", "realme拉低品牌调性"],
      },
    ],
  },
  t3_scene: {
    lead:
      "年轻化/影像场景战场：vivo 用<b>技术+IP锁死场景</b>；OPPO 用<b>明星+场景硬蹭</b>。同样流量艺人战略，路子完全不同。",
    a: {
      name: "vivo",
      ncls: "b",
      tagline: "技术驱动，场景锚定",
      points: [
        { ico: "🔬", title: "① 技术先行", sub: "蔡司2亿像素长焦 / 自研蓝图影像芯片V3+" },
        { ico: "🎯", title: "② 场景锚定", sub: "「演唱会神器」「山顶也是VIP」" },
        { ico: "🎤", title: "③ IP放大", sub: "《歌手2024/2025》官方影像技术合作伙伴" },
      ],
      verdict: { type: "ok", text: "场景心智清晰，有产品力支撑" },
    },
    b: {
      name: "OPPO",
      ncls: "g",
      tagline: "流量驱动，场景漂移",
      points: [
        { ico: "⭐", title: "① 明星先行", sub: "1+N代言人矩阵 / 2023签约7名艺人" },
        { ico: "📷", title: "② 功能跟随", sub: "「旅拍神器」哈苏联名Find X系列" },
        { ico: "❓", title: "③ 场景模糊", sub: "旅拍?人像?演唱会?没有一个锁死的记忆点" },
      ],
      verdict: { type: "warn", text: "流量曝光有，场景心智弱" },
    },
    poslead: "影像合作品牌定位：联名方向不同，折射出完全不同的市场野心。",
    posA: {
      name: "vivo × 蔡司",
      ncls: "b",
      since: "合作始于 2021年",
      items: ["德系精密光学，专业相机心智", "「买相机送手机」定位", "已深耕10年影像生态", "蔡司APO认证，有技术背书"],
      slogan: '"山顶也是VIP"',
      sub: "场景具体，功能直接",
      vtype: "ok",
    },
    posB: {
      name: "OPPO × 哈苏",
      ncls: "g",
      since: "合作始于 2021年",
      items: ["瑞典艺术相机，高端调性", "「影像画质革命」定位", "哈苏自然色彩方案", "双潜望镜堆料显著"],
      slogan: '"移动影像画质革命"',
      sub: "定位宏大，场景模糊",
      vtype: "warn",
    },
  },
  t4_duel: {
    lead: "「演唱会场景」争夺战：vivo 用技术+IP锁死场景；OPPO 用明星+场景硬蹭。",
    sideA: {
      name: "vivo 的打法",
      rows: [
        { label: "技术", text: "专门研发「演唱会长焦模式」，V3+芯片定制优化演唱会视频" },
        { label: "IP", text: "连续两年成为《歌手》官方影像技术合作伙伴(非单纯冠名)" },
        { label: "口号", text: "「山顶也是VIP」——直接告诉你在哪用、解决什么痛点" },
        { label: "结果", text: "演唱会=vivo 的心智已被主流用户接受" },
      ],
    },
    sideB: {
      name: "OPPO 的打法",
      rows: [
        { label: "技术", text: "Find X 确有强长焦，但官方主推「旅拍/画质」而非演唱会" },
        { label: "明星", text: "母亲节「追星妈妈」想蹭演唱会场景，但路径是用户UGC非技术背书" },
        { label: "痛点", text: "想打「追星妈妈」人群，但既没vivo长焦技术叙事，也缺IP锁定" },
        { label: "结果", text: "演唱会场景被vivo/三星占据后，用内容营销补位，但缺乏根基" },
      ],
    },
    essence: {
      title: "本质差距",
      rows: [
        "vivo 先有产品能力(2亿像素长焦)→ 再提炼场景卖点 → 再找IP放大",
        "OPPO 先有明星和流量需求 → 再反推场景 → 产品能力是后验的",
        "当消费者问『演唱会用哪个手机拍?』时，vivo 已用技术+口号回答了",
        "OPPO 还在用『追星妈妈』情感营销建立关联，但链路太长",
      ],
    },
  },
  t5_crisis: {
    lead: "公关危机烈度时间轴：连续翻车才是系统性问题的信号。",
    events: [
      { score: 3, name: "莫奈紫 '少妇心' 争议", date: "2026春", type: "营销失当", cls: "g" },
      { score: 6, name: "绿线门 售后差异", date: "2025", type: "产品/售后", cls: "y" },
      { score: 9, name: "『两个老公』文案发出", date: "2026.5.8", type: "营销翻车", cls: "r" },
      { score: 8, name: "删文道歉 但关闭评论", date: "2026.5.8", type: "公关失误", cls: "r" },
      { score: 4, name: "二次道歉 高管降级", date: "2026.5.11", type: "危机处置", cls: "g" },
    ],
    conclusion:
      "这一次看似是文案问题，但反映的是 OPPO 背后的<b>市占焦虑</b>，以及为了营销出奇制胜，<b>从上层到执行层中间的全链路变形</b>。单点事故不可怕，连续翻车才是系统性问题的信号。",
  },
  foot:
    "复刻自『OPPO品牌危机数据图鉴』· 市占/份额为趋势示意，基于 IDC/Counterpoint 公开报道 · 危机事件综合媒体报道整理",
};
