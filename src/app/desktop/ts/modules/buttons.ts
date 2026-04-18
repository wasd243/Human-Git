import {invoke} from "@tauri-apps/api/core";
import type {MutationPayload} from "./listener";

interface SetupButtonHandlersParams {
    syncBtn: HTMLElement;
    btnShowChanges: HTMLElement;
    btnGitInit: HTMLElement;
    btnOpenPullUI: HTMLElement;
    topUI: HTMLElement;
    bottomUI: HTMLElement;
    rightUI: HTMLElement;
    btnCloseTopUI: HTMLElement;
    btnCloseBottomUI: HTMLElement;
    btnCloseRightUI: HTMLElement;
    btnDoGitInit: HTMLElement;
    btnChooseFolder: HTMLElement;
    btnPullAction: HTMLElement;
    pullConfirmOverlay: HTMLElement;
    btnPullCancel: HTMLElement;
    btnPullConfirm: HTMLElement;
    fileListEl: HTMLElement;
    stagedListEl: HTMLElement;
    btnStageSelected: HTMLElement;
    btnStageAll: HTMLElement;
    btnQuickDeploy: HTMLButtonElement;
    btnCommit: HTMLElement;
    btnPush: HTMLElement;
    commitMessageEl: HTMLTextAreaElement;
    selectedUnstagedPaths: Set<string>;
    refreshFileList: () => Promise<void>;
    setStats: (stats: MutationPayload) => void;
    resetStats: () => void;
    printLog: (msg: string) => void;
}

const isEnglishCommitMessage = (message: string) => !/[^\x00-\x7F]/.test(message);

export const setupButtonHandlers = ({
    syncBtn,
    btnShowChanges,
    btnGitInit,
    btnOpenPullUI,
    topUI,
    bottomUI,
    rightUI,
    btnCloseTopUI,
    btnCloseBottomUI,
    btnCloseRightUI,
    btnDoGitInit,
    btnChooseFolder,
    btnPullAction,
    pullConfirmOverlay,
    btnPullCancel,
    btnPullConfirm,
    fileListEl,
    stagedListEl,
    btnStageSelected,
    btnStageAll,
    btnQuickDeploy,
    btnCommit,
    btnPush,
    commitMessageEl,
    selectedUnstagedPaths,
    refreshFileList,
    setStats,
    resetStats,
    printLog
}: SetupButtonHandlersParams) => {
    let activeRepoPath = ".";
    const showMainButtons = () => {
        (btnGitInit as HTMLButtonElement).style.display = "";
        (btnOpenPullUI as HTMLButtonElement).style.display = "";
        (btnShowChanges as HTMLButtonElement).style.display = "";
    };

    const hideMainButtons = () => {
        (btnGitInit as HTMLButtonElement).style.display = "none";
        (btnOpenPullUI as HTMLButtonElement).style.display = "none";
        (btnShowChanges as HTMLButtonElement).style.display = "none";
    };

    syncBtn.addEventListener("click", async () => {
        printLog("Connecting to shadow dimension...");
        try {
            await invoke("run_shadow_commit", {repoPath: null});
            printLog("Checkpoint created successfully.");
        } catch (e) {
            printLog(`Error: ${e}`);
        }
    });

    btnShowChanges.addEventListener("click", () => {
        topUI.classList.add("show");
        hideMainButtons();
        void refreshFileList();
    });

    btnCloseTopUI.addEventListener("click", () => {
        topUI.classList.remove("show");
        showMainButtons();
    });

    btnStageSelected.addEventListener("click", async () => {
        const paths = Array.from(selectedUnstagedPaths);

        if (paths.length === 0) {
            printLog("[SYSTEM] No files selected for staging.");
            return;
        }

        try {
            const result = await invoke<string>("stage_files", {paths});
            printLog(`[SUCCESS] ${result}`);
            selectedUnstagedPaths.clear();
            await refreshFileList();
        } catch (e) {
            printLog(`[ERR] ${e}`);
        }
    });

    btnStageAll.addEventListener("click", async () => {
        try {
            const result = await invoke<string>("stage_files", {paths: ["*"]});
            printLog(`[SUCCESS] ${result}`);
            selectedUnstagedPaths.clear();
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

        if (!isEnglishCommitMessage(msg)) {
            printLog("[SYSTEM] Commit message must be in English.");
            return;
        }

        try {
            printLog("[GIT] Creating commit...");
            const result = await invoke<string>("commit_changes", {message: msg});
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
        if (message && !isEnglishCommitMessage(message)) {
            printLog("[SYSTEM] Commit message must be in English.");
            return;
        }

        const payload = message ? {message} : {message: null};

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

    btnGitInit.addEventListener("click", () => {
        bottomUI.classList.add("show");
        hideMainButtons();
    });

    btnCloseBottomUI.addEventListener("click", () => {
        bottomUI.classList.remove("show");
        showMainButtons();
    });

    btnOpenPullUI.addEventListener("click", () => {
        rightUI.classList.add("show");
        pullConfirmOverlay.classList.add("hidden");
        hideMainButtons();
    });

    btnCloseRightUI.addEventListener("click", () => {
        rightUI.classList.remove("show");
        pullConfirmOverlay.classList.add("hidden");
        showMainButtons();
    });

    btnPullAction.addEventListener("click", () => {
        pullConfirmOverlay.classList.remove("hidden");
    });

    btnPullCancel.addEventListener("click", () => {
        pullConfirmOverlay.classList.add("hidden");
    });

    btnPullConfirm.addEventListener("click", async () => {
        pullConfirmOverlay.classList.add("hidden");
        printLog("[GIT] Pulling current branch from origin...");

        try {
            const result = await invoke<string>("pull_changes");
            printLog(`[SUCCESS] ${result}`);
            await refreshFileList();
        } catch (e) {
            printLog(`[ERR] ${e}`);
        }
    });

    btnDoGitInit.addEventListener("click", async () => {
        printLog(`[GIT] Initializing repository in ${activeRepoPath}...`);
        try {
            const result = await invoke<string>("git_init", {repoPath: activeRepoPath});
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

                await invoke("update_repo_path", {path});
                activeRepoPath = path;
                selectedUnstagedPaths.clear();
                fileListEl.innerHTML = "";
                stagedListEl.innerHTML = "";
                btnQuickDeploy.disabled = true;
                printLog(`[SYSTEM] Monitoring switched to: ${path}`);

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
};
