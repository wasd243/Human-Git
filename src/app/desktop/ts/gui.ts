import {invoke} from "@tauri-apps/api/core";
import {listen} from "@tauri-apps/api/event";
import "../css/components.css";
import "../css/panels.css";

import {backgroundAnimation} from "./modules/background";
import {leftUI} from "./modules/leftUI";
import {printLog} from "./modules/log";

// 定义一个简单的结构体，对应 Rust 发过来的数据
interface MutationPayload {
    insertions: number;
    deletions: number;
}

interface FileStatus {
    x: string;
    y: string;
    path: string;
}

const isStagedFile = (file: FileStatus) => file.x.trim() !== "" && file.x !== "?";

// 找到那些显示数字的元素
const insEl = document.getElementById("ins-value")!;
const delEl = document.getElementById("del-value")!;

const syncBtn = document.getElementById("btn-sync")!;
const btnShowChanges = document.getElementById("btn-show-changes")!;
const btnGitInit = document.getElementById("btn-git-init")!;
const topUI = document.getElementById("top-ui")!;
const bottomUI = document.getElementById("bottom-ui")!;
const btnCloseTopUI = document.getElementById("btn-close-top-ui")!;
const btnCloseBottomUI = document.getElementById("btn-close-bottom-ui")!;
const btnDoGitInit = document.getElementById("btn-do-git-init")!;
const btnChooseFolder = document.getElementById("btn-choose-folder")!;
const fileListEl = document.getElementById("file-list")!;
const btnStageSelected = document.getElementById("btn-stage-selected")!;
const btnStageAll = document.getElementById("btn-stage-all")!;
const btnQuickDeploy = document.getElementById("btn-quick-deploy") as HTMLButtonElement;
const btnCommit = document.getElementById("btn-commit")!;
const btnPush = document.getElementById("btn-push")!;
const commitMessageEl = document.getElementById("commit-message") as HTMLTextAreaElement;
const stagedSectionEl = document.createElement("div");
const stagedTitleEl = document.createElement("div");
const stagedListEl = document.createElement("div");
let activeRepoPath = ".";

stagedSectionEl.id = "staged-files-section";
stagedTitleEl.id = "staged-files-title";
stagedListEl.id = "staged-file-list";
stagedTitleEl.textContent = "Staged changes";
stagedSectionEl.style.marginTop = "8px";
stagedTitleEl.style.marginBottom = "6px";
stagedTitleEl.style.fontWeight = "600";
stagedListEl.style.maxHeight = "120px";
stagedListEl.style.overflowY = "auto";
stagedListEl.style.border = "1px solid rgba(255,255,255,0.15)";
stagedListEl.style.borderRadius = "6px";
stagedListEl.style.padding = "6px";
stagedSectionEl.appendChild(stagedTitleEl);
stagedSectionEl.appendChild(stagedListEl);
commitMessageEl.insertAdjacentElement("afterend", stagedSectionEl);


const setStats = (stats: MutationPayload) => {
    insEl.textContent = stats.insertions.toString();
    delEl.textContent = stats.deletions.toString();
};

const resetStats = () => {
    insEl.textContent = "0";
    delEl.textContent = "0";
};

// --- 核心逻辑 ---

// 0. 监听通用日志事件
listen<string>("log-event", (event) => {
    printLog(event.payload);
});

// 1. 监听 Rust 侧的变动广播
listen<MutationPayload>("git-mutation", (event) => {
    const {insertions, deletions} = event.payload;
    setStats({insertions, deletions});
    printLog(`Detected movement: +${insertions} / -${deletions}`);
});

// 1.5 Fetch initial stats right after UI loads
invoke<MutationPayload>("get_initial_stats").then((payload) => {
    setStats(payload);
}).catch((e) => {
    printLog(`[ERR] Failed to fetch initial stats: ${e}`);
});

// 2. 按钮点击触发手动同步
syncBtn.addEventListener("click", async () => {
    printLog("Connecting to shadow dimension...");
    try {
        // 调用 Rust 侧定义的 #[tauri::command]
        await invoke("run_shadow_commit", { repoPath: null });
        printLog("Checkpoint created successfully.");
    } catch (e) {
        printLog(`Error: ${e}`);
    }
});

printLog("[HumanGit] Engine Online.");

// --- UI Additions for Show Changes ---

const refreshFileList = async () => {
    try {
        const files = await invoke<FileStatus[]>("get_working_status");
        const stagedFiles = files.filter(isStagedFile);
        const unstagedFiles = files.filter(file => !isStagedFile(file));

        fileListEl.innerHTML = "";
        stagedListEl.innerHTML = "";
        btnQuickDeploy.disabled = files.length === 0;

        if (unstagedFiles.length === 0) {
            fileListEl.innerHTML = `<div class="file-item"><span class="file-path">No unstaged changes.</span></div>`;
        }

        unstagedFiles.forEach(file => {
            const div = document.createElement("div");
            div.className = "file-item";
            div.innerHTML = `
                <input type="checkbox" data-path="${file.path}">
                <span class="file-status">[${file.x}${file.y}]</span>
                <span class="file-path">${file.path}</span>
            `;
            div.addEventListener("click", (e) => {
                if ((e.target as HTMLElement).tagName !== 'INPUT') {
                    const checkbox = div.querySelector('input')!;
                    checkbox.checked = !checkbox.checked;
                }
            });
            fileListEl.appendChild(div);
        });

        if (stagedFiles.length === 0) {
            stagedListEl.innerHTML = `<div class="file-item"><span class="file-path">No staged changes.</span></div>`;
            return;
        }

        stagedFiles.forEach(file => {
            const div = document.createElement("div");
            div.className = "file-item";
            div.innerHTML = `
                <span class="file-status">[${file.x}${file.y}]</span>
                <span class="file-path">${file.path}</span>
            `;
            stagedListEl.appendChild(div);
        });
    } catch (e) {
        fileListEl.innerHTML = "";
        stagedListEl.innerHTML = "";
        btnQuickDeploy.disabled = true;
        printLog(`[ERR] Failed to fetch file status: ${e}`);
    }
};

// 在 refreshFileList 函数定义之后添加
listen<boolean>("files-changed", () => {
    printLog("[SYSTEM] File change detected, refreshing list...");
    if (topUI.classList.contains("show")) {
        refreshFileList();
    }
});

btnShowChanges.addEventListener("click", () => {
    topUI.classList.add("show");
    btnShowChanges.style.display = "none";
    btnGitInit.style.display = "none";
    refreshFileList();
});

btnCloseTopUI.addEventListener("click", () => {
    topUI.classList.remove("show");
    btnShowChanges.style.display = "";
    btnGitInit.style.display = "";
});

btnStageSelected.addEventListener("click", async () => {
    const checkboxes = fileListEl.querySelectorAll('input[type="checkbox"]:checked');
    const paths = Array.from(checkboxes).map(cb => (cb as HTMLInputElement).dataset.path!);
    
    if (paths.length === 0) {
        printLog("[SYSTEM] No files selected for staging.");
        return;
    }

    try {
        const result = await invoke<string>("stage_files", { paths });
        printLog(`[SUCCESS] ${result}`);
        await refreshFileList();
    } catch (e) {
        printLog(`[ERR] ${e}`);
    }
});

btnStageAll.addEventListener("click", async () => {
    try {
        const result = await invoke<string>("stage_files", { paths: ["*"] });
        printLog(`[SUCCESS] ${result}`);
        await refreshFileList();
    } catch (e) {
        printLog(`[ERR] ${e}`);
    }
});

btnCommit.addEventListener("click", async () => {
    const msg = commitMessageEl.value.trim();
    if (!msg) {
        printLog("[SYSTEM] Commit message cannot be empty.");
        return;
    }

    try {
        printLog("[GIT] Creating commit...");
        const result = await invoke<string>("commit_changes", { message: msg });
        printLog(`[SUCCESS] ${result}`);
        commitMessageEl.value = "";
        await refreshFileList();
    } catch (e) {
        printLog(`[ERR] ${e}`);
    }
});

btnPush.addEventListener("click", async () => {
    try {
        printLog("[GIT] Pushing current branch to origin...");
        const result = await invoke<string>("push_changes");
        printLog(`[SUCCESS] ${result}`);
    } catch (e) {
        printLog(`[ERR] ${e}`);
    }
});

btnQuickDeploy.addEventListener("click", async () => {
    if (btnQuickDeploy.disabled) {
        return;
    }

    const message = commitMessageEl.value.trim();
    const payload = message ? { message } : { message: null };

    btnQuickDeploy.disabled = true;

    try {
        printLog("[GIT] Running quick deploy: stage, commit, push...");
        const result = await invoke<string>("commit_and_push", payload);
        printLog(`[SUCCESS] ${result}`);
        commitMessageEl.value = "";
    } catch (e) {
        printLog(`[ERR] ${e}`);
    } finally {
        await refreshFileList();
    }
});

// --- UI Additions for Git Init ---

btnGitInit.addEventListener("click", () => {
    bottomUI.classList.add("show");
    btnGitInit.style.display = "none";
    btnShowChanges.style.display = "none";
});

btnCloseBottomUI.addEventListener("click", () => {
    bottomUI.classList.remove("show");
    btnGitInit.style.display = "";
    btnShowChanges.style.display = "";
});

btnDoGitInit.addEventListener("click", async () => {
    printLog(`[GIT] Initializing repository in ${activeRepoPath}...`);
    try {
        const result = await invoke<string>("git_init", { repoPath: activeRepoPath });
        printLog(`[SUCCESS] ${result}`);
        const stats = await invoke<MutationPayload>("get_initial_stats");
        setStats(stats);
    } catch (e) {
        printLog(`[ERR] ${e}`);
    }
});

btnChooseFolder.addEventListener("click", async () => {
    printLog("[SYSTEM] Opening folder dialog...");
    try {
        const path = await invoke<string | null>("open_folder_dialog");
        if (path) {
            printLog(`[SYSTEM] Folder selected: ${path}`);

            // 1. Activate the listener and refresh cache/stats
            await invoke("update_repo_path", { path: path });
            activeRepoPath = path;
            fileListEl.innerHTML = "";
            stagedListEl.innerHTML = "";
            btnQuickDeploy.disabled = true;
            printLog(`[SYSTEM] Monitoring switched to: ${path}`);

            // 2. Refresh UI stats only if the selected folder is already a repo.
            try {
                const stats = await invoke<MutationPayload>("get_initial_stats");
                setStats(stats);
            } catch (_statsErr) {
                resetStats();
                printLog("[SYSTEM] Selected folder is not a Git repository yet.");
            }
        } else {
            printLog("[SYSTEM] Folder selection cancelled.");
        }
    } catch (e) {
        printLog(`[ERR] ${e}`);
    }
});

backgroundAnimation();
leftUI();
setInterval(async () => {
    await refreshFileList();
}, 1000);
