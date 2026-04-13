import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// 定义一个简单的结构体，对应 Rust 发过来的数据
interface MutationPayload {
    insertions: number;
    deletions: number;
}

// 找到那些显示数字的元素
const insEl = document.getElementById("ins-value")!;
const delEl = document.getElementById("del-value")!;
const consoleEl = document.getElementById("console-output")!;
const syncBtn = document.getElementById("btn-sync")!;
// 找到全屏背景层
const bgCanvas = document.getElementById("千里江山图")!;

// 滚动速度控制
let velocity = 0; // 当前滚动的速度
const maxSpeed = 5; // 最大滚动速度 (px/frame)
const edgeWidth = 0.2; // 屏幕边缘触发滚动的范围 (左右各 20%)
let baseOffset = 0; // 自动滚动的基准 (负数向左移)
let isInitialized = false;

// 每一帧更新位置的函数
const animate = () => {
    if (isInitialized) {
        // 更新基准偏移
        baseOffset += velocity;
        
        // 限制不要滑出画卷的左边界 (baseOffset 是负数或 0)
        if (baseOffset > 0) baseOffset = 0;
        
        // 应用位置
        bgCanvas.style.backgroundPosition = `${baseOffset}px center`;
    }
    requestAnimationFrame(animate); // 循环调用
};

// 启动动画循环
animate();

window.addEventListener("mousemove", (e) => {
    const width = window.innerWidth;
    const x = e.clientX;
    const ratio = x / width;

    if (ratio > (1 - edgeWidth)) {
        // 鼠标靠右：持续向左滚动 (减少 baseOffset)
        // 越靠右速度越快
        velocity = -((ratio - (1 - edgeWidth)) / edgeWidth) * maxSpeed;
    } else if (ratio < edgeWidth) {
        // 鼠标靠左：持续向右滚动 (增加 baseOffset)
        velocity = ((edgeWidth - ratio) / edgeWidth) * maxSpeed;
    } else {
        // 在中间区域：停止滚动
        velocity = 0;
    }
});

// 打印日志到界面上
const printLog = (msg: string) => {
    const p = document.createElement("p");
    
    // 简单的日志染色解析逻辑 (复用之前的设计思路)
    if (msg.startsWith("[SYSTEM]")) p.className = "log-system";
    else if (msg.startsWith("[ERR]")) p.className = "log-err";
    else if (msg.startsWith("[GIT]")) p.className = "log-git";
    else if (msg.startsWith("[SUCCESS]")) p.className = "log-success";
    else if (msg.startsWith("[EVENT]")) p.className = "log-event";

    p.textContent = `> ${msg}`;
    consoleEl.prepend(p);

    // 识别到 "Engine Online" 时触发自动向左滚动一段距离 (仅触发一次)
    if (msg.includes("[HumanGit] Engine Online") && !isInitialized) {
        isInitialized = true;

        // 1. 点亮江山
        bgCanvas.classList.add("engine-active");

        // 2. 核心：使用 window.innerHeight 动态计算，大约向左滑 2 倍的高度，以此隐藏原版的落款和注释
        baseOffset -= window.innerHeight * 2;
    }
};

// --- 核心逻辑 ---

// 0. 监听通用日志事件
listen<string>("log-event", (event) => {
    printLog(event.payload);
});

// 1. 监听 Rust 侧的变动广播
listen<MutationPayload>("git-mutation", (event) => {
    const { insertions, deletions } = event.payload;
    insEl.textContent = insertions.toString();
    delEl.textContent = deletions.toString();
    printLog(`Detected movement: +${insertions} / -${deletions}`);
});

// 2. 按钮点击触发手动同步
syncBtn.addEventListener("click", async () => {
    printLog("Connecting to shadow dimension...");
    try {
        // 调用 Rust 侧定义的 #[tauri::command]
        await invoke("run_shadow_sync", { repoPath: "." });
        printLog("Checkpoint created successfully.");
    } catch (e) {
        printLog(`Error: ${e}`);
    }
});

printLog("[HumanGit] Engine Online.");