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

// 打印日志到界面上
const printLog = (msg: string) => {
    const p = document.createElement("p");
    p.textContent = `> ${msg}`;
    consoleEl.prepend(p);
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