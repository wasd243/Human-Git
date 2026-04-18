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
    btnRemoteAction: HTMLElement;
    remoteInputPanel: HTMLElement;
    remoteUrlInput: HTMLTextAreaElement;
    remoteListEl: HTMLElement;
    pullConfirmOverlay: HTMLElement;
    btnPullCancel: HTMLElement;
    btnPullConfirm: HTMLElement;
    remoteConfirmOverlay: HTMLElement;
    btnRemoteCancel: HTMLElement;
    btnRemoteConfirm: HTMLElement;
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

const isEnglishText = (message: string) => !/[^\x00-\x7F]/.test(message);
const conventionalCommitRegex = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9\-_./]+\))?!?: [\x20-\x7E]+$/;
const isValidGitRemoteUrl = (url: string) => /^(https?:\/\/|ssh:\/\/|git@)[^\s]+\.git$/.test(url);

const validateCommitMessage = (msg: string): string | null => {
    if (!msg) return "Commit message cannot be empty.";
    if (!isEnglishText(msg)) return "Commit message must be in English.";
    if (!conventionalCommitRegex.test(msg)) {
        return "Commit message must follow Conventional Commits, e.g. feat: add remote management.";
    }
    return null;
};

const renderRemoteList = (remoteListEl: HTMLElement, remotes: string[]) => {
    remoteListEl.innerHTML = "";

    if (remotes.length === 0) {
        remoteListEl.innerHTML = `<div class="remote-item"><span class="file-path">No remotes configured.</span></div>`;
        return;
    }

    remotes.forEach((remote) => {
        const row = document.createElement("div");
        row.className = "remote-item";
        row.textContent = remote;
        remoteListEl.appendChild(row);
    });
};

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
    btnRemoteAction,
    remoteInputPanel,
    remoteUrlInput,
    remoteListEl,
    pullConfirmOverlay,
    btnPullCancel,
    btnPullConfirm,
    remoteConfirmOverlay,
    btnRemoteCancel,
    btnRemoteConfirm,
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

    const refreshRemoteList = async () => {
        try {
            const remotes = await invoke<string[]>("list_remotes");
            renderRemoteList(remoteListEl, remotes);
        } catch (e) {
            remoteListEl.innerHTML = `<div class="remote-item"><span class="file-path">Failed to load remotes.</span></div>`;
            printLog(`[ERR] Failed to fetch remotes: ${e}`);
        }
    };

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
        const validationErr = validateCommitMessage(msg);

        if (validationErr) {
            printLog(`[SYSTEM] ${validationErr}`);
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
        const validationErr = validateCommitMessage(message);

        if (validationErr) {
            printLog(`[SYSTEM] ${validationErr}`);
            return;
        }

        btnQuickDeploy.disabled = true;

        try {
            printLog("[GIT] Running quick deploy: stage, commit, push...");
            const result = await invoke<string>("commit_and_push", {message});
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
        remoteConfirmOverlay.classList.add("hidden");
        remoteInputPanel.classList.add("hidden");
        hideMainButtons();
        void refreshRemoteList();
    });

    btnCloseRightUI.addEventListener("click", () => {
        rightUI.classList.remove("show");
        pullConfirmOverlay.classList.add("hidden");
        remoteConfirmOverlay.classList.add("hidden");
        remoteInputPanel.classList.add("hidden");
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

    btnRemoteAction.addEventListener("click", () => {
        if (remoteInputPanel.classList.contains("hidden")) {
            remoteInputPanel.classList.remove("hidden");
            remoteUrlInput.focus();
            printLog("[SYSTEM] Enter remote URL ending with .git, then click Remote again.");
            return;
        }

        const url = remoteUrlInput.value.trim();
        if (!url) {
            printLog("[SYSTEM] Remote URL cannot be empty.");
            return;
        }

        if (!isValidGitRemoteUrl(url)) {
            printLog("[SYSTEM] Invalid remote URL. Example: https://github.com/org/repo.git");
            return;
        }

        remoteConfirmOverlay.classList.remove("hidden");
    });

    btnRemoteCancel.addEventListener("click", () => {
        remoteConfirmOverlay.classList.add("hidden");
    });

    btnRemoteConfirm.addEventListener("click", async () => {
        remoteConfirmOverlay.classList.add("hidden");

        const url = remoteUrlInput.value.trim();
        if (!url) {
            printLog("[SYSTEM] Remote URL cannot be empty.");
            return;
        }

        if (!isValidGitRemoteUrl(url)) {
            printLog("[SYSTEM] Invalid remote URL. Example: https://github.com/org/repo.git");
            return;
        }

        printLog("[GIT] Adding remote 'origin'...");

        try {
            await invoke<string>("add_remote_origin", {url});
            remoteUrlInput.value = "";
            await refreshRemoteList();
        } catch (_) {
            // Result is sent through backend emit: "remote-add-result"
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
                remoteListEl.innerHTML = "";
                btnQuickDeploy.disabled = true;
                printLog(`[SYSTEM] Monitoring switched to: ${path}`);

                try {
                    const stats = await invoke<MutationPayload>("get_initial_stats");
                    setStats(stats);
                } catch (_statsErr) {
                    resetStats();
                    printLog("[SYSTEM] Selected folder is not a Git repository yet.");
                }

                await refreshRemoteList();
            } else {
                printLog("[SYSTEM] Folder selection cancelled.");
            }
        } catch (e) {
            printLog(`[ERR] ${e}`);
        }
    });
};
