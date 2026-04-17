const bgCanvas = document.getElementById("千里江山图")!;
let isInitialized = false;
const consoleEl = document.getElementById("console-output")!;

export function  printLog(msg: string) {
    const p = document.createElement("p");

    // 简单的日志染色解析逻辑 (复用之前的设计思路)
    if (msg.startsWith("[SYSTEM]")) p.className = "log-system";
    else if (msg.startsWith("[ERR]")) p.className = "log-err";
    else if (msg.startsWith("[GIT]")) p.className = "log-git";
    else if (msg.startsWith("[SUCCESS]")) p.className = "log-success";
    else if (msg.startsWith("[EVENT]")) p.className = "log-event";

    p.textContent = `> ${msg}`;
    consoleEl.prepend(p);

    bgCanvas.classList.add("engine-active");

    isInitialized = true;
}