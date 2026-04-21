import {invoke} from "@tauri-apps/api/core";
import type {MutationPayload} from "./listener";

interface SetupButtonHandlersParams {
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
    btnFetchAction: HTMLElement;
    fetchPruneCheckbox: HTMLInputElement;
    fetchPruneToggleLabel: HTMLElement;
    fetchPruneConfirmOverlay: HTMLElement;
    btnFetchPruneCancel: HTMLElement;
    btnFetchPruneConfirm: HTMLElement;
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
    forcePushCheckbox: HTMLInputElement;
    forcePushToggleLabel: HTMLElement;
    forceModeConfirmOverlay: HTMLElement;
    btnForceModeCancel: HTMLElement;
    btnForceModeConfirm: HTMLElement;
    forcePushConfirmOverlay: HTMLElement;
    btnForcePushCancel: HTMLElement;
    btnForcePushConfirm: HTMLElement;
    commitMessageEl: HTMLTextAreaElement;
    signingEnabledCheckbox: HTMLInputElement;
    sshKeySelect: HTMLSelectElement;
    btnPickSshKey: HTMLElement;
    signingDisableConfirmOverlay: HTMLElement;
    btnSigningDisableCancel: HTMLElement;
    btnSigningDisableConfirm: HTMLElement;
    signingVerifiedBadge: HTMLElement;
    selectedUnstagedPaths: Set<string>;
    refreshFileList: () => Promise<void>;
    setStats: (stats: MutationPayload) => void;
    resetStats: () => void;
    printLog: (msg: string) => void;
    onRepoContextChange: (path: string | null) => void;
}

interface ButtonHandlersApi {
    setActiveRepoPath: (path: string) => void;
}

interface SshKeyInfo {
    file_name: string;
    full_path: string;
    comment: string;
}

const createKeyLabel = (k: SshKeyInfo) =>
    k.comment?.trim().length ? `${k.file_name} — ${k.comment}` : k.file_name;

const isValidGitRemoteUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed || /\s/.test(trimmed)) {
        return false;
    }

    // Supports standard remote formats:
    // - https://host/owner/repo(.git)
    // - ssh://...
    // - git://...
    // - git@host:owner/repo(.git)
    return /^(https?:\/\/|ssh:\/\/|git:\/\/)[^\s]+$/.test(trimmed)
        || /^git@[^:\s]+:[^\s]+$/.test(trimmed);
};

const createRemoteMessageRow = (message: string) => {
    const row = document.createElement("div");
    row.className = "remote-item";

    const text = document.createElement("span");
    text.className = "file-path";
    text.textContent = message;

    row.appendChild(text);
    return row;
};

const renderRemoteList = (remoteListEl: HTMLElement, remotes: string[]) => {
    remoteListEl.replaceChildren();

    if (remotes.length === 0) {
        remoteListEl.appendChild(createRemoteMessageRow("No remotes configured."));
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
    btnFetchAction,
    fetchPruneCheckbox,
    fetchPruneToggleLabel,
    fetchPruneConfirmOverlay,
    btnFetchPruneCancel,
    btnFetchPruneConfirm,
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
    forcePushCheckbox,
    forcePushToggleLabel,
    forceModeConfirmOverlay,
    btnForceModeCancel,
    btnForceModeConfirm,
    forcePushConfirmOverlay,
    btnForcePushCancel,
    btnForcePushConfirm,
    commitMessageEl,
    signingEnabledCheckbox,
    sshKeySelect,
    btnPickSshKey,
    signingDisableConfirmOverlay,
    btnSigningDisableCancel,
    btnSigningDisableConfirm,
    signingVerifiedBadge,
    selectedUnstagedPaths,
    refreshFileList,
    setStats,
    resetStats,
    printLog,
    onRepoContextChange
}: SetupButtonHandlersParams) => {
    let activeRepoPath: string | null = null;
    let detectedKeys: SshKeyInfo[] = [];
    let manualKeyPath: string | null = null;

    const selectedKeyPath = () => {
        const value = sshKeySelect.value?.trim();
        if (!value) return null;
        return value === "__manual__" ? manualKeyPath : value;
    };

    const updateVerifiedBadge = () => {
        const show = signingEnabledCheckbox.checked && !!selectedKeyPath();
        signingVerifiedBadge.classList.toggle("hidden", !show);
    };

    const renderKeyOptions = () => {
        const previousValue = sshKeySelect.value;
        sshKeySelect.replaceChildren();

        if (detectedKeys.length === 0 && !manualKeyPath) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "No SSH key detected";
            sshKeySelect.appendChild(opt);
            sshKeySelect.disabled = true;
            updateVerifiedBadge();
            return;
        }

        sshKeySelect.disabled = false;

        for (const key of detectedKeys) {
            const opt = document.createElement("option");
            opt.value = key.full_path;
            opt.textContent = createKeyLabel(key);
            sshKeySelect.appendChild(opt);
        }

        if (manualKeyPath) {
            const opt = document.createElement("option");
            opt.value = "__manual__";
            opt.textContent = `Manual key — ${manualKeyPath}`;
            sshKeySelect.appendChild(opt);
        }

        if (previousValue) {
            const hasPrevious = Array.from(sshKeySelect.options).some((o) => o.value === previousValue);
            if (hasPrevious) {
                sshKeySelect.value = previousValue;
            }
        }

        if (!sshKeySelect.value && sshKeySelect.options.length > 0) {
            sshKeySelect.selectedIndex = 0;
        }

        updateVerifiedBadge();
    };

    const applySigningConfig = async () => {
        if (!signingEnabledCheckbox.checked) {
            const result = await invoke<string>("disable_ssh_signing");
            printLog(`[SUCCESS] ${result}`);
            updateVerifiedBadge();
            return;
        }

        const keyPath = selectedKeyPath();
        if (!keyPath) {
            printLog("[SYSTEM] Select an SSH key first.");
            updateVerifiedBadge();
            return;
        }

        const result = await invoke<string>("enable_ssh_signing", {keyPath});
        printLog(`[SUCCESS] ${result}`);
        updateVerifiedBadge();
    };

    const refreshDetectedKeys = async () => {
        try {
            detectedKeys = await invoke<SshKeyInfo[]>("detect_ssh_keys");
            renderKeyOptions();
        } catch (e) {
            detectedKeys = [];
            renderKeyOptions();
            printLog(`[ERR] Failed to detect SSH keys: ${e}`);
        }
    };

    const setActiveRepoPathInternal = (path: string | null) => {
        if (!path) {
            activeRepoPath = null;
            onRepoContextChange(null);
            return;
        }

        const trimmedPath = path.trim();
        activeRepoPath = trimmedPath.length > 0 ? trimmedPath : null;
        onRepoContextChange(activeRepoPath);
    };

    const applyForcePushVisualState = (enabled: boolean) => {
        forcePushCheckbox.checked = enabled;
        forcePushToggleLabel.classList.toggle("danger", enabled);
        btnPush.classList.toggle("force-danger", enabled);
    };

    const applyFetchPruneVisualState = (enabled: boolean) => {
        fetchPruneCheckbox.checked = enabled;
        fetchPruneToggleLabel.classList.toggle("danger", enabled);
        btnFetchAction.classList.toggle("prune-danger", enabled);
    };

    const doPush = async (force: boolean) => {
        try {
            if (force) {
                printLog("[GIT] Force pushing current branch to origin...");
            } else {
                printLog("[GIT] Pushing current branch to origin...");
            }
            const result = await invoke<string>("push_changes", {force});
            printLog(`[SUCCESS] ${result}`);
        } catch (e) {
            printLog(`[ERR] ${e}`);
        }
    };

    const refreshRemoteList = async () => {
        try {
            const remotes = await invoke<string[]>("list_remotes");
            renderRemoteList(remoteListEl, remotes);
        } catch (e) {
            remoteListEl.replaceChildren();
            remoteListEl.appendChild(createRemoteMessageRow("Failed to load remotes."));
            printLog(`[ERR] Failed to fetch remotes: ${e}`);
        }
    };

    const invokeFetch = async (prune: boolean): Promise<string> => {
        return await invoke<string>("fetch_changes", {remote: "origin", prune});
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

    applyForcePushVisualState(false);
    applyFetchPruneVisualState(false);
    void refreshDetectedKeys();
    updateVerifiedBadge();

    sshKeySelect.addEventListener("change", async () => {
        updateVerifiedBadge();
        if (!signingEnabledCheckbox.checked) return;
        try {
            await applySigningConfig();
        } catch (e) {
            printLog(`[ERR] ${e}`);
        }
    });

    btnPickSshKey.addEventListener("click", async () => {
        try {
            const picked = await invoke<string | null>("pick_ssh_key_file");
            if (!picked) {
                printLog("[SYSTEM] SSH key file selection cancelled.");
                return;
            }
            manualKeyPath = picked;
            renderKeyOptions();
            sshKeySelect.value = "__manual__";
            printLog(`[SYSTEM] Manual SSH key selected: ${picked}`);

            if (signingEnabledCheckbox.checked) {
                await applySigningConfig();
            }
        } catch (e) {
            printLog(`[ERR] ${e}`);
        }
    });

    signingEnabledCheckbox.addEventListener("change", async () => {
        if (!signingEnabledCheckbox.checked) {
            signingDisableConfirmOverlay.classList.remove("hidden");
            signingEnabledCheckbox.checked = true; // wait for confirm
            return;
        }

        try {
            await applySigningConfig();
        } catch (e) {
            printLog(`[ERR] ${e}`);
        }
    });

    btnSigningDisableCancel.addEventListener("click", () => {
        signingDisableConfirmOverlay.classList.add("hidden");
        signingEnabledCheckbox.checked = true;
        updateVerifiedBadge();
    });

    btnSigningDisableConfirm.addEventListener("click", async () => {
        signingDisableConfirmOverlay.classList.add("hidden");
        signingEnabledCheckbox.checked = false;
        try {
            await applySigningConfig();
        } catch (e) {
            printLog(`[ERR] ${e}`);
        }
    });

    btnShowChanges.addEventListener("click", () => {
        topUI.classList.add("show");
        hideMainButtons();
        void refreshDetectedKeys();
        void refreshFileList();
    });

    btnCloseTopUI.addEventListener("click", () => {
        topUI.classList.remove("show");
        forceModeConfirmOverlay.classList.add("hidden");
        forcePushConfirmOverlay.classList.add("hidden");
        signingDisableConfirmOverlay.classList.add("hidden");
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
        const msg = commitMessageEl.value;

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
        if (forcePushCheckbox.checked) {
            forcePushConfirmOverlay.classList.remove("hidden");
            return;
        }

        await doPush(false);
    });

    forcePushCheckbox.addEventListener("change", () => {
        if (forcePushCheckbox.checked) {
            forceModeConfirmOverlay.classList.remove("hidden");
            applyForcePushVisualState(false);
            return;
        }
        applyForcePushVisualState(false);
        printLog("[SYSTEM] Force Push mode disabled.");
    });

    btnForceModeCancel.addEventListener("click", () => {
        forceModeConfirmOverlay.classList.add("hidden");
        applyForcePushVisualState(false);
        printLog("[SYSTEM] Cancel ForcePush.");
    });

    btnForceModeConfirm.addEventListener("click", () => {
        forceModeConfirmOverlay.classList.add("hidden");
        applyForcePushVisualState(true);
        printLog("[SYSTEM] Force Push mode enabled.");
    });

    btnForcePushCancel.addEventListener("click", () => {
        forcePushConfirmOverlay.classList.add("hidden");
        printLog("[SYSTEM] Force push canceled.");
    });

    btnForcePushConfirm.addEventListener("click", async () => {
        forcePushConfirmOverlay.classList.add("hidden");
        await doPush(true);
    });

    btnQuickDeploy.addEventListener("click", async () => {
        if (btnQuickDeploy.disabled) {
            return;
        }

        const message = commitMessageEl.value.trim();
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
        fetchPruneConfirmOverlay.classList.add("hidden");
        remoteInputPanel.classList.add("hidden");
        hideMainButtons();
        void refreshRemoteList();
    });

    btnCloseRightUI.addEventListener("click", () => {
        rightUI.classList.remove("show");
        pullConfirmOverlay.classList.add("hidden");
        remoteConfirmOverlay.classList.add("hidden");
        fetchPruneConfirmOverlay.classList.add("hidden");
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

    fetchPruneCheckbox.addEventListener("change", () => {
        if (fetchPruneCheckbox.checked) {
            fetchPruneConfirmOverlay.classList.remove("hidden");
            applyFetchPruneVisualState(false);
            return;
        }
        applyFetchPruneVisualState(false);
        printLog("[SYSTEM] Fetch prune mode (-p) disabled.");
    });

    btnFetchPruneCancel.addEventListener("click", () => {
        fetchPruneConfirmOverlay.classList.add("hidden");
        applyFetchPruneVisualState(false);
        printLog("[SYSTEM] Cancel enabling fetch prune mode (-p).");
    });

    btnFetchPruneConfirm.addEventListener("click", () => {
        fetchPruneConfirmOverlay.classList.add("hidden");
        applyFetchPruneVisualState(true);
        printLog("[SYSTEM] Fetch prune mode (-p) enabled.");
    });

    btnFetchAction.addEventListener("click", async () => {
        const prune = fetchPruneCheckbox.checked;
        if (prune) {
            printLog("[GIT] Fetching from origin with prune (-p)...");
        } else {
            printLog("[GIT] Fetching from origin...");
        }

        try {
            const result = await invokeFetch(prune);
            printLog(`[SUCCESS] ${result}`);
            await refreshRemoteList();
        } catch (e) {
            printLog(`[ERR] ${e}`);
        }
    });

    btnRemoteAction.addEventListener("click", () => {
        if (remoteInputPanel.classList.contains("hidden")) {
            remoteInputPanel.classList.remove("hidden");
            remoteUrlInput.focus();
            printLog("[SYSTEM] Enter a valid remote URL, then click Remote again.");
            return;
        }

        const url = remoteUrlInput.value.trim();
        if (!url) {
            printLog("[SYSTEM] Remote URL cannot be empty.");
            return;
        }

        if (!isValidGitRemoteUrl(url)) {
            printLog("[SYSTEM] Invalid remote URL. Example: https://github.com/org/repo");
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
            printLog("[SYSTEM] Invalid remote URL. Example: https://github.com/org/repo");
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
        if (!activeRepoPath) {
            printLog("[SYSTEM] Please choose a folder before initializing a repository.");
            return;
        }

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
                setActiveRepoPathInternal(path);
                selectedUnstagedPaths.clear();
                fileListEl.replaceChildren();
                stagedListEl.replaceChildren();
                remoteListEl.replaceChildren();
                btnQuickDeploy.disabled = true;
                applyForcePushVisualState(false);
                applyFetchPruneVisualState(false);
                printLog(`[SYSTEM] Monitoring switched to: ${path}`);

                try {
                    const stats = await invoke<MutationPayload>("get_initial_stats");
                    setStats(stats);
                } catch (_statsErr) {
                    resetStats();
                    printLog("[SYSTEM] Selected folder is not a Git repository yet.");
                }

                await refreshDetectedKeys();
                if (signingEnabledCheckbox.checked && selectedKeyPath()) {
                    try {
                        await applySigningConfig();
                    } catch (e) {
                        printLog(`[ERR] ${e}`);
                    }
                }

                await refreshRemoteList();
            } else {
                printLog("[SYSTEM] Folder selection cancelled.");
            }
        } catch (e) {
            printLog(`[ERR] ${e}`);
        }
    });

    return {
        setActiveRepoPath: (path: string) => {
            setActiveRepoPathInternal(path);
        }
    } satisfies ButtonHandlersApi;
};
