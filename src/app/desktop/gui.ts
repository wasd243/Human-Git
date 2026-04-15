import {invoke} from "@tauri-apps/api/core";
import {listen} from "@tauri-apps/api/event";
import "/css/components.css";
import "/css/panels.css";

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

// 找到那些显示数字的元素
const insEl = document.getElementById("ins-value")!;
const delEl = document.getElementById("del-value")!;
const consoleEl = document.getElementById("console-output")!;
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
const btnCommit = document.getElementById("btn-commit")!;
const btnPush = document.getElementById("btn-push")!;
const commitMessageEl = document.getElementById("commit-message") as HTMLTextAreaElement;
// 找到全屏背景层
const bgCanvas = document.getElementById("千里江山图")!;

// 滚动速度控制
let velocity = 0; // 当前滚动的速度
const maxSpeed = 5; // 最大滚动速度 (px/frame)
const idleSpeed = -0.3; // 像 MC 界面那样的中间区域自动缓慢向左滑动 (px/frame)
const edgeWidth = 0.2; // 屏幕边缘触发滚动的范围 (左右各 20%)
let baseOffset = 0; // 自动滚动的基准 (负数向左移)
let isInitialized = false;

// 记录背景图片的纵横比以计算循环宽度
let imgAspectRatio = 23.2; // 根据文件名 51,3x1191,5_cm 预估的比例 (1191.5 / 51.3)
const bgImg = new Image();
// 修正 URL 获取方式，确保能正确处理带括号的文件名
const rawBgUrl = getComputedStyle(bgCanvas).backgroundImage || "";
const cleanUrl = rawBgUrl.trim().replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
bgImg.src = cleanUrl || 'assets/Wang_Ximeng._A_Thousand_Li_of_Rivers_and_Mountains._(Complete,_51,3x1191,5_cm)._1113._Palace_museum,_Beijing - 副本.jpg';

bgImg.onload = () => {
    if (bgImg.height > 0) {
        imgAspectRatio = bgImg.width / bgImg.height;
    }
};

// 每一帧更新位置的函数
const animate = () => {
    if (isInitialized) {
        // 更新基准偏移
        baseOffset += velocity;

        // 计算当前图片的实际渲染宽度 (使用 vh 保持一致性)
        const vh = window.innerHeight;
        const imgWidth = vh * imgAspectRatio;

        // 实现无缝循环
        if (imgWidth > 0) {
            baseOffset %= imgWidth;
            // 确保如果 baseOffset 变成正数（向右滑），也能正确回绕到负数区间实现无缝连接
            if (baseOffset > 0) baseOffset -= imgWidth;
        }

        // 最终安全检查：防止 NaN 或 Infinity 导致 backgroundPosition 失效
        if (!isFinite(baseOffset)) {
            baseOffset = 0;
        }

        // 双层并排渲染：第一层在 baseOffset，第二层紧跟在其右侧，避免边界露底色
        const nextOffset = baseOffset + imgWidth;
        bgCanvas.style.backgroundPosition = `${baseOffset}px center, ${nextOffset}px center`;
    }
    requestAnimationFrame(animate); // 循环调用
};

// 启动动画循环
animate();

window.addEventListener("mousemove", (e) => {
    const width = window.innerWidth;
    if (width <= 0) return; // 安全防御：防止除以 0 产生 Infinity

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
        // 在中间区域：像 MC 界面那样的向左缓慢滑动
        velocity = idleSpeed;
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
    const {insertions, deletions} = event.payload;
    insEl.textContent = insertions.toString();
    delEl.textContent = deletions.toString();
    printLog(`Detected movement: +${insertions} / -${deletions}`);
});

// 1.5 Fetch initial stats right after UI loads
invoke<MutationPayload>("get_initial_stats").then((payload) => {
    insEl.textContent = payload.insertions.toString();
    delEl.textContent = payload.deletions.toString();
}).catch((e) => {
    printLog(`[ERR] Failed to fetch initial stats: ${e}`);
});

// 2. 按钮点击触发手动同步
syncBtn.addEventListener("click", async () => {
    printLog("Connecting to shadow dimension...");
    try {
        // 调用 Rust 侧定义的 #[tauri::command]
        await invoke("run_shadow_sync", { repoPath: null });
        printLog("Checkpoint created successfully.");
    } catch (e) {
        printLog(`Error: ${e}`);
    }
});

printLog("[HumanGit] Engine Online.");


// --- UI Additions for SHADOW_SYNC ---
const triggerBtn = document.createElement("button");
triggerBtn.id = "top-left-sync-btn";
triggerBtn.innerHTML = `<span class="gear-icon">⚙</span>`;
document.body.appendChild(triggerBtn);

const leftUI = document.createElement("div");
leftUI.id = "left-ui";
document.body.appendChild(leftUI);

// Move the original sync button into the new UI
leftUI.appendChild(syncBtn);

// Interactions
triggerBtn.addEventListener("click", () => {
    leftUI.classList.toggle("show");
});

// --- UI Additions for Show Changes ---

const refreshFileList = async () => {
    try {
        const files = await invoke<FileStatus[]>("get_working_status");
        fileListEl.innerHTML = "";
        files.forEach(file => {
            const div = document.createElement("div");
            div.className = "file-item";
            const isChecked = file.x !== "" && file.x !== " ";
            div.innerHTML = `
                <input type="checkbox" data-path="${file.path}" ${isChecked ? "checked" : ""}>
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
    } catch (e) {
        printLog(`[ERR] Failed to fetch file status: ${e}`);
    }
};

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
    printLog("[GIT] Initializing repository...");
    try {
        const result = await invoke<string>("git_init", { repoPath: "." });
        printLog(`[SUCCESS] ${result}`);
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
            
            // 1. Initialize repository
            printLog("[GIT] Initializing repository in selected folder...");
            try {
                const initResult = await invoke<string>("git_init", { repoPath: path });
                printLog(`[SUCCESS] git init succeed: ${initResult}`);
            } catch (initErr) {
                printLog(`[ERR] git init failed: ${initErr}`);
            }
            
            // 2. Activate the listener and refresh cache/stats
            await invoke("update_repo_path", { path: path });
            printLog(`[SYSTEM] Monitoring switched to: ${path}`);

            // 3. Refresh UI stats
            const stats = await invoke<MutationPayload>("get_initial_stats");
            insEl.textContent = stats.insertions.toString();
            delEl.textContent = stats.deletions.toString();
        } else {
            printLog("[SYSTEM] Folder selection cancelled.");
        }
    } catch (e) {
        printLog(`[ERR] ${e}`);
    }
});
