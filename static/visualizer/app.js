"use strict";
/* عناصر اصلی SVG و لایه‌های رسم گراف */
const svg = document.getElementById("graph");
const viewport = document.getElementById("viewport");
const edgesLayer = document.getElementById("edges-layer");
const nodesLayer = document.getElementById("nodes-layer");

/* فرم تنظیمات گراف و ورودی‌ها */
const form = document.getElementById("graph-form");
const nodesInput = document.getElementById("nodes");
const edgesInput = document.getElementById("edges");
const edgeLimit = document.getElementById("edge-limit");

/* عناصر نمایش آمار و وضعیت گراف */
const nodeCount = document.getElementById("node-count");
const edgeCount = document.getElementById("edge-count");
const status = document.getElementById("status");
const zoomLabel = document.getElementById("zoom-label");

/* فضای نام SVG برای ساخت عناصر گراف */
const NS = "http://www.w3.org/2000/svg";

/* ابعاد منطقی بوم و محدودیت تعداد رأس‌ها */
const WIDTH = 1000;
const HEIGHT = 650;
const MAX_NODES = 150;

/* رنگ رأس‌ها به ترتیب چرخشی استفاده می‌شود */
const palette = [
    { fill: "#FFE17A", stroke: "#E8B800" },
    { fill: "#A9D6FF", stroke: "#2980F0" },
    { fill: "#C9F4E4", stroke: "#1BAA83" },
    { fill: "#E2D2FF", stroke: "#9067F8" },
    { fill: "#FFD0D7", stroke: "#F45B78" },
    { fill: "#FFE0BD", stroke: "#F49B32" },
    { fill: "#B9EEFA", stroke: "#19A9D2" }
];

/* داده‌های فعلی گراف و ارجاع به عناصر رسم‌شده */
let nodes = [];
let edges = [];
let nodeElements = new Map();
let edgeElements = [];

/* وضعیت بزرگ‌نمایی و جابه‌جایی نمای گراف */
let scale = 1;
let tx = 0;
let ty = 0;

/*
 * وضعیت تعامل فعلی:
 * null یعنی تعامل فعالی نداریم.
 * type: "node" برای کشیدن رأس و "pan" برای حرکت کل گراف.
 */
let interaction = null;

/* جلوگیری از ارسال هم‌زمان چند درخواست ساخت گراف */
let requestPending = false;


/* نمایش پیام موفقیت یا خطا در پنل تنظیمات */
function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("error", isError);
}


/* ساخت عنصر SVG و تنظیم ویژگی‌های آن */
function createSvgElement(name, attributes = {}) {
    const element = document.createElementNS(NS, name);

    for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, String(value));
    }
    return element;
}

/* اعمال زوم و جابه‌جایی روی کل گراف */
function updateViewport() {
    viewport.setAttribute(
        "transform",
        `translate(${tx} ${ty}) scale(${scale})`
    );

    // هماهنگ‌کردن درصد زوم با نمای فعلی
    zoomLabel.textContent = `${Math.round(scale * 100)}%`;
}

/*
 * تبدیل مختصات صفحه به مختصات داخلی گراف.
 * برای کشیدن رأس لازم است چون گراف ممکن است زوم یا جابه‌جا شده باشد.
 */
function screenToGraph(event) {
    const rect = svg.getBoundingClientRect();
    const px = (event.clientX - rect.left) * WIDTH / rect.width;
    const py = (event.clientY - rect.top) * HEIGHT / rect.height;
    return {
        x: (px - tx) / scale,
        y: (py - ty) / scale
    };
}

/* تبدیل مختصات اشاره‌گر به مختصات خام بوم SVG */
function getSvgPoint(event) {
    const rect = svg.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left) * WIDTH / rect.width,
        y: (event.clientY - rect.top) * HEIGHT / rect.height
    };
}

/* پاک‌کردن رسم قبلی و ساخت دوباره رأس‌ها و یال‌ها */
function drawGraph() {
    edgesLayer.replaceChildren();
    nodesLayer.replaceChildren();
    nodeElements = new Map();
    edgeElements = [];

    // ساخت یال‌ها پیش از رأس‌ها تا خطوط زیر دایره‌ها قرار بگیرند
    const edgeFragment = document.createDocumentFragment();
    for (const edge of edges) {
        const line = createSvgElement("line", {
            class: "edge",
            x1: nodes[edge.source].x,
            y1: nodes[edge.source].y,
            x2: nodes[edge.target].x,
            y2: nodes[edge.target].y
        });
        edgeFragment.appendChild(line);

        // نگه‌داشتن ارجاع یال برای به‌روزرسانی هنگام حرکت رأس
        edgeElements.push({ element: line, edge });
    }
    edgesLayer.appendChild(edgeFragment);

    // ساخت رأس‌ها و شماره داخل هر رأس
    const nodeFragment = document.createDocumentFragment();
    nodes.forEach((node, index) => {
        const color = palette[index % palette.length];
        const group = createSvgElement("g", {
            class: "node",
            tabindex: "0",
            role: "button",
            "aria-label": `رأس ${index}`,
            "data-id": index,
            transform: `translate(${node.x} ${node.y})`
        });
        const circle = createSvgElement("circle", {
            r: 22,
            fill: color.fill,
            stroke: color.stroke
        });
        const label = createSvgElement("text", {
            x: 0,
            y: 1
        });
        label.textContent = String(index);
        group.append(circle, label);
        nodeFragment.appendChild(group);

        // ذخیره عنصر هر رأس برای دسترسی سریع هنگام کشیدن آن
        nodeElements.set(index, group);
    });
    nodesLayer.appendChild(nodeFragment);

    // به‌روزرسانی آمار
    nodeCount.textContent = String(nodes.length);
    edgeCount.textContent = String(edges.length);
    updateViewport();
}

/* به‌روزرسانی مختصات فقط یال‌هایی که به رأس جابه‌جاشده متصل‌اند */
function updateConnectedEdges(nodeId) {
    for (const item of edgeElements) {
        const { source, target } = item.edge;

        // یال‌های نامرتبط با رأس فعلی نیازی به تغییر ندارند
        if (source !== nodeId && target !== nodeId) {
            continue;
        }
        const a = nodes[source];
        const b = nodes[target];
        item.element.setAttribute("x1", String(a.x));
        item.element.setAttribute("y1", String(a.y));
        item.element.setAttribute("x2", String(b.x));
        item.element.setAttribute("y2", String(b.y));
    }
}

/* محاسبه حداکثر تعداد یال مجاز برای یک گراف ساده */
function updateEdgeLimit() {
    const n = Number(nodesInput.value);
    if (!Number.isInteger(n) || n < 1 || n > MAX_NODES) {
        edgeLimit.textContent =
            `تعداد رأس باید بین 1 و ${MAX_NODES} باشد.`;
        edgesInput.max = "0";
        return;
    }

    // در گراف ساده بدون جهت، هر جفت رأس حداکثر یک یال دارد
    const max = n * (n - 1) / 2;
    edgesInput.max = String(max);
    edgeLimit.textContent =
        `حداکثر یال برای این تعداد راس: ${max}`;

    // اگر تعداد یال بیشتر از حد مجاز شد، مقدار را اصلاح کن
    if (Number(edgesInput.value) > max) {
        edgesInput.value = String(max);
    }
}

/* به‌روزرسانی محدودیت یال هنگام تغییر تعداد راس */
nodesInput.addEventListener("input", updateEdgeLimit);

/* ساخت گراف با ارسال تنظیمات به API جنگو */
form.addEventListener("submit", async (event) => {
    event.preventDefault();

    // از ارسال درخواست تکراری جلوگیری کن
    if (requestPending) {
        return;
    }
    const n = Number(nodesInput.value);
    const m = Number(edgesInput.value);
    const maxEdges = n * (n - 1) / 2;

    // اعتبارسنجی مقادیر پیش از ارسال درخواست
    if (
        !Number.isInteger(n) ||
        !Number.isInteger(m) ||
        n < 1 ||
        n > MAX_NODES ||
        m < 0 ||
        m > maxEdges
    ) {
        setStatus("تعداد رأس یا یال معتبر نیست.", true);
        return;
    }
    const csrfToken = form.querySelector(
        '[name="csrfmiddlewaretoken"]'
    ).value;
    requestPending = true;
    const submitButton = form.querySelector('[type="submit"]');
    submitButton.disabled = true;
    setStatus("در حال ساخت گراف...");
    try {
        // درخواست ساخت گراف در سمت سرور
        const response = await fetch("/api/generate/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken
            },
            credentials: "same-origin",
            body: JSON.stringify({
                nodes: n,
                edges: m
            })
        });
        const data = await response.json();
        // تبدیل خطاهای HTTP یا خطای اعلام‌شده از سمت سرور به پیام قابل نمایش
        if (!response.ok) {
            throw new Error(
                typeof data.error === "string"
                    ? data.error
                    : "ساخت گراف ناموفق بود."
            );
        }

        // تعیین موقعیت تصادفی برای هر رأس در محدوده بوم
        nodes = data.nodes.map((id) => ({
            id,
            x: 60 + Math.random() * (WIDTH - 120),
            y: 60 + Math.random() * (HEIGHT - 120)
        }));
        edges = data.edges;

        // گراف جدید از نمای پیش‌فرض شروع می‌شود
        scale = 1;
        tx = 0;
        ty = 0;
        drawGraph();
        setStatus("گراف با موفقیت ساخته شد.");
    } catch (error) {
        // نمایش پیام خطا بدون از دست‌دادن پیام خطای معتبر سرور
        setStatus(
            error instanceof Error
                ? error.message
                : "خطای غیرمنتظره رخ داد.",
            true
        );
    } finally {
        // آزادکردن فرم حتی اگر درخواست با خطا مواجه شود
        requestPending = false;
        submitButton.disabled = false;
    }
});

/* تولید مجدد گراف با همان تعداد رأس و یال انتخاب‌شده */
document.getElementById("randomize").addEventListener("click", () => {
    form.requestSubmit();
});

/* پاک‌کردن داده‌ها و رسم یک بوم خالی */
document.getElementById("clear").addEventListener("click", () => {
    nodes = [];
    edges = [];
    interaction = null;
    drawGraph();
    setStatus("گراف پاک شد.");
});

/* بزرگ‌نمایی با دکمه؛ حداکثر سه برابر */
document.getElementById("zoom-in").addEventListener("click", () => {
    scale = Math.min(3, scale * 1.2);
    updateViewport();
});

/* کوچک‌نمایی با دکمه؛ حداقل ۳۰ درصد */
document.getElementById("zoom-out").addEventListener("click", () => {
    scale = Math.max(0.3, scale / 1.2);
    updateViewport();
});

/* بازگرداندن زوم و موقعیت گراف به حالت اولیه */
document.getElementById("reset-view").addEventListener("click", () => {
    scale = 1;
    tx = 0;
    ty = 0;
    updateViewport();
});

/* شروع کشیدن رأس یا جابه‌جایی کل گراف */
svg.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
        return;
    }
    const nodeElement = event.target.closest("g.node");
    if (nodeElement && nodesLayer.contains(nodeElement)) {
        // اگر اشاره‌گر روی رأس باشد، همان رأس را انتخاب کن
        const id = Number(nodeElement.getAttribute("data-id"));
        if (!Number.isInteger(id) || !nodes[id]) {
            return;
        }
        const point = screenToGraph(event);
        interaction = {
            type: "node",
            id,
            offsetX: nodes[id].x - point.x,
            offsetY: nodes[id].y - point.y
        };
    } else {
        // اگر روی فضای خالی بوم باشد، کل گراف جابه‌جا می‌شود
        const point = getSvgPoint(event);
        interaction = {
            type: "pan",
            startX: point.x,
            startY: point.y,
            originalX: tx,
            originalY: ty
        };
    }

    // ادامه تعامل حتی اگر اشاره‌گر از محدوده SVG خارج شود
    svg.setPointerCapture(event.pointerId);
});

/* به‌روزرسانی موقعیت رأس یا کل گراف هنگام حرکت اشاره‌گر */
svg.addEventListener("pointermove", (event) => {
    if (!interaction) {
        return;
    }
    if (interaction.type === "node") {
        const point = screenToGraph(event);
        const node = nodes[interaction.id];

        // جلوگیری از خروج مرکز رأس از محدوده بوم
        node.x = Math.max(
            25,
            Math.min(WIDTH - 25, point.x + interaction.offsetX)
        );
        node.y = Math.max(
            25,
            Math.min(HEIGHT - 25, point.y + interaction.offsetY)
        );
        const group = nodeElements.get(interaction.id);
        if (group) {
            group.setAttribute(
                "transform",
                `translate(${node.x} ${node.y})`
            );
        }

        // اتصال یال‌ها به موقعیت جدید راس
        updateConnectedEdges(interaction.id);
    } else {
        // جابه‌جایی کل گراف بدون تغییر مختصات اصلی راس‌ها
        const point = getSvgPoint(event);
        tx = interaction.originalX + point.x - interaction.startX;
        ty = interaction.originalY + point.y - interaction.startY;
        updateViewport();
    }
});

/* پایان‌دادن به تعامل جاری */
function stopInteraction() {
    interaction = null;
}

svg.addEventListener("pointerup", stopInteraction);
svg.addEventListener("pointercancel", stopInteraction);
svg.addEventListener("lostpointercapture", stopInteraction);

/* زوم با اسکرول و حفظ نقطه زیر اشاره‌گر */
svg.addEventListener("wheel", (event) => {
    event.preventDefault();
    const point = getSvgPoint(event);
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    const nextScale = Math.max(
        0.3,
        Math.min(3, scale * factor)
    );

    // اصلاح جابه‌جایی برای اینکه زوم حول محل اشاره‌گر انجام شود
    tx = point.x - (point.x - tx) * (nextScale / scale);
    ty = point.y - (point.y - ty) * (nextScale / scale);
    scale = nextScale;
    updateViewport();
}, { passive: false });


/* آماده‌سازی محدودیت یال و نمایش بوم خالی هنگام بارگذاری صفحه */
updateEdgeLimit();
drawGraph();
