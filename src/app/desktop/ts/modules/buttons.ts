import {invoke} from "@tauri-apps/api/core";
import type {MutationPayload} from "./listener";
import {
    MANUAL_OPTION_VALUE,
    ORIGIN_REMOTE,
    type ButtonHandlersApi,
    type GpgBinaryInfo,
    type SetupButtonHandlersParams,
    type SshKeyInfo
} from "./buttons/types";
import {setupBtnShowChanges} from "./buttons/btnShowChanges";
import {setupBtnPullAction} from "./buttons/btnPullAction";
import {setupBtnOpenPullUI} from "./buttons/btnOpenPullUI";
import {setupBtnCloseTopUI} from "./buttons/btnCloseTopUI";
import {setupBtnChooseFolder} from "./buttons/btnChooseFolder";
import {setupBtnCloseRightUI} from "./buttons/btnCloseRightUI";
import {setupBtnFetchPruneCancel} from "./buttons/btnFetchPruneCancel";
import {applyFetchPruneVisualState} from "./buttons/fetchPruneToggleLabel";
import {setupBtnDoGitInit} from "./buttons/btnDoGitInit";
import {setupBtnFetchPruneConfirm} from "./buttons/btnFetchPruneConfirm";
import {setupBtnRemoteAction} from "./buttons/btnRemoteAction";
import {setupFetchPruneCheckbox} from "./buttons/fetchPruneCheckbox";
import {setupBtnFetchAction} from "./buttons/btnFetchAction";
import {setupBtnGitInit} from "./buttons/btnGitInit";
import {setupBtnCloseBottomUI} from "./buttons/btnCloseBottomUI";
import {setupBtnStageSelected} from "./buttons/btnStageSelected";
import {setupBtnStageAll} from "./buttons/btnStageAll";
import {setupBtnCommit} from "./buttons/btnCommit";
import {setupBtnPush} from "./buttons/btnPush";
import {setupForcePushCheckbox} from "./buttons/forcePushCheckbox";
import {setupBtnForceModeCancel} from "./buttons/btnForceModeCancel";
import {setupBtnForceModeConfirm} from "./buttons/btnForceModeConfirm";
import {setupBtnForcePushCancel} from "./buttons/btnForcePushCancel";
import {setupBtnForcePushConfirm} from "./buttons/btnForcePushConfirm";
import {setupBtnQuickDeploy} from "./buttons/btnQuickDeploy";
import {setupSigningEnabledCheckbox} from "./buttons/signingEnabledCheckbox";
import {setupBtnRemoteCancel} from "./buttons/btnRemoteCancel";
import {setupBtnRemoteConfirm} from "./buttons/btnRemoteConfirm";
import {applyForcePushToggleLabelState} from "./buttons/forcePushToggleLabel";
import {asFileListEl} from "./buttons/fileListEl";
import {asStagedListEl} from "./buttons/stagedListEl";

const createKeyLabel = (k: SshKeyInfo) =>
    k.comment?.trim().length ? `${k.file_name} — ${k.comment}` : k.file_name;

const isValidGitRemoteUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed || /\s/.test(trimmed)) {
        return false;
    }

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
    signingModeSelect,
    sshSigningControls,
    gpgSigningControls,
    sshKeySelect,
    btnPickSshKey,
    gpgBinarySelect,
    btnPickGpgBinary,
    gpgSigningKeyInput,
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
    let detectedGpgBinaries: GpgBinaryInfo[] = [];
    let manualGpgProgramPath: string | null = null;

    const selectedSigningMode = () => signingModeSelect.value === "gpg" ? "gpg" : "ssh";

    const selectedKeyPath = () => {
        const value = sshKeySelect.value?.trim();
        if (!value) return null;
        return value === MANUAL_OPTION_VALUE ? manualKeyPath : value;
    };

    const selectedGpgProgramPath = () => {
        const value = gpgBinarySelect.value?.trim();
        if (!value) return null;
        return value === MANUAL_OPTION_VALUE ? manualGpgProgramPath : value;
    };

    const updateSigningModeUI = () => {
        const useGpg = selectedSigningMode() === "gpg";
        sshSigningControls.classList.toggle("hidden", useGpg);
        gpgSigningControls.classList.toggle("hidden", !useGpg);
    };

    const updateVerifiedBadge = () => {
        const selected = selectedSigningMode() === "gpg"
            ? !!selectedGpgProgramPath()
            : !!selectedKeyPath();
        const show = signingEnabledCheckbox.checked && selected;
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
            opt.value = MANUAL_OPTION_VALUE;
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

    const renderGpgOptions = () => {
        const previousValue = gpgBinarySelect.value;
        gpgBinarySelect.replaceChildren();

        if (detectedGpgBinaries.length === 0 && !manualGpgProgramPath) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "No GPG binary detected";
            gpgBinarySelect.appendChild(opt);
            gpgBinarySelect.disabled = true;
            updateVerifiedBadge();
            return;
        }

        gpgBinarySelect.disabled = false;

        for (const bin of detectedGpgBinaries) {
            const opt = document.createElement("option");
            opt.value = bin.full_path;
            opt.textContent = `${bin.file_name} — ${bin.full_path}`;
            gpgBinarySelect.appendChild(opt);
        }

        if (manualGpgProgramPath) {
            const opt = document.createElement("option");
            opt.value = MANUAL_OPTION_VALUE;
            opt.textContent = `Manual program — ${manualGpgProgramPath}`;
            gpgBinarySelect.appendChild(opt);
        }

        if (previousValue) {
            const hasPrevious = Array.from(gpgBinarySelect.options).some((o) => o.value === previousValue);
            if (hasPrevious) {
                gpgBinarySelect.value = previousValue;
            }
        }

        if (!gpgBinarySelect.value && gpgBinarySelect.options.length > 0) {
            gpgBinarySelect.selectedIndex = 0;
        }

        updateVerifiedBadge();
    };

    const applySigningConfig = async () => {
        const mode = selectedSigningMode();

        if (!signingEnabledCheckbox.checked) {
            const result = mode === "gpg"
                ? await invoke<string>("disable_gpg_signing")
                : await invoke<string>("disable_ssh_signing");
            printLog(`[SUCCESS] ${result}`);
            updateVerifiedBadge();
            return;
        }

        if (mode === "gpg") {
            const gpgProgramPath = selectedGpgProgramPath();
            if (!gpgProgramPath) {
                printLog("[SYSTEM] Select a GPG program first.");
                updateVerifiedBadge();
                return;
            }

            const signingKey = gpgSigningKeyInput.value.trim() || null;
            const result = await invoke<string>("enable_gpg_signing", {gpgProgramPath, signingKey});
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

    const refreshDetectedGpgPrograms = async () => {
        try {
            detectedGpgBinaries = await invoke<GpgBinaryInfo[]>("detect_gpg_binaries");
            renderGpgOptions();
        } catch (e) {
            detectedGpgBinaries = [];
            renderGpgOptions();
            printLog(`[ERR] Failed to detect GPG binaries: ${e}`);
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
        applyForcePushToggleLabelState(forcePushToggleLabel, enabled);
        btnPush.classList.toggle("force-danger", enabled);
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
        return await invoke<string>("fetch_changes", {remote: ORIGIN_REMOTE, prune});
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
    applyFetchPruneVisualState({
        fetchPruneCheckbox,
        fetchPruneToggleLabel,
        btnFetchAction,
        enabled: false
    });
    updateSigningModeUI();
    void refreshDetectedKeys();
    void refreshDetectedGpgPrograms();
    updateVerifiedBadge();

    setupBtnShowChanges({
        btnShowChanges,
        topUI,
        hideMainButtons,
        refreshDetectedKeys,
        refreshDetectedGpgPrograms,
        refreshFileList
    });

    setupBtnCloseTopUI({
        btnCloseTopUI,
        topUI,
        forceModeConfirmOverlay,
        forcePushConfirmOverlay,
        signingDisableConfirmOverlay,
        showMainButtons
    });

    setupBtnGitInit({
        btnGitInit,
        bottomUI,
        hideMainButtons
    });

    setupBtnCloseBottomUI({
        btnCloseBottomUI,
        bottomUI,
        showMainButtons
    });

    setupBtnOpenPullUI({
        btnOpenPullUI,
        rightUI,
        pullConfirmOverlay,
        remoteConfirmOverlay,
        fetchPruneConfirmOverlay,
        remoteInputPanel,
        hideMainButtons,
        refreshRemoteList
    });

    setupBtnCloseRightUI({
        btnCloseRightUI,
        rightUI,
        pullConfirmOverlay,
        remoteConfirmOverlay,
        fetchPruneConfirmOverlay,
        remoteInputPanel,
        showMainButtons
    });

    setupBtnPullAction({
        btnPullAction,
        pullConfirmOverlay
    });

    setupFetchPruneCheckbox({
        fetchPruneCheckbox,
        fetchPruneConfirmOverlay,
        fetchPruneToggleLabel,
        btnFetchAction,
        printLog
    });

    setupBtnFetchPruneCancel({
        btnFetchPruneCancel,
        fetchPruneConfirmOverlay,
        fetchPruneCheckbox,
        fetchPruneToggleLabel,
        btnFetchAction,
        printLog
    });

    setupBtnFetchPruneConfirm({
        btnFetchPruneConfirm,
        fetchPruneConfirmOverlay,
        fetchPruneCheckbox,
        fetchPruneToggleLabel,
        btnFetchAction,
        printLog
    });

    setupBtnFetchAction({
        btnFetchAction,
        fetchPruneCheckbox,
        invokeFetch,
        refreshRemoteList,
        printLog
    });

    setupBtnRemoteAction({
        btnRemoteAction,
        remoteInputPanel,
        remoteUrlInput,
        remoteConfirmOverlay,
        printLog,
        isValidGitRemoteUrl
    });

    setupBtnDoGitInit({
        btnDoGitInit,
        getActiveRepoPath: () => activeRepoPath,
        setStats,
        printLog
    });

    setupBtnChooseFolder({
        btnChooseFolder,
        setActiveRepoPathInternal,
        selectedUnstagedPaths,
        fileListEl: asFileListEl(fileListEl),
        stagedListEl: asStagedListEl(stagedListEl),
        remoteListEl,
        btnQuickDeploy,
        applyForcePushVisualState,
        fetchPruneCheckbox,
        fetchPruneToggleLabel,
        btnFetchAction,
        printLog,
        setStats,
        resetStats,
        refreshDetectedKeys,
        refreshDetectedGpgPrograms,
        signingEnabledCheckbox,
        applySigningConfig,
        refreshRemoteList
    });

    signingModeSelect.addEventListener("change", async () => {
        updateSigningModeUI();
        updateVerifiedBadge();
        if (!signingEnabledCheckbox.checked) return;
        try {
            await applySigningConfig();
        } catch (e) {
            printLog(`[ERR] ${e}`);
        }
    });

    sshKeySelect.addEventListener("change", async () => {
        updateVerifiedBadge();
        if (!signingEnabledCheckbox.checked || selectedSigningMode() !== "ssh") return;
        try {
            await applySigningConfig();
        } catch (e) {
            printLog(`[ERR] ${e}`);
        }
    });

    gpgBinarySelect.addEventListener("change", async () => {
        updateVerifiedBadge();
        if (!signingEnabledCheckbox.checked || selectedSigningMode() !== "gpg") return;
        try {
            await applySigningConfig();
        } catch (e) {
            printLog(`[ERR] ${e}`);
        }
    });

    gpgSigningKeyInput.addEventListener("change", async () => {
        if (!signingEnabledCheckbox.checked || selectedSigningMode() !== "gpg") return;
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
            sshKeySelect.value = MANUAL_OPTION_VALUE;
            printLog(`[SYSTEM] Manual SSH key selected: ${picked}`);

            if (signingEnabledCheckbox.checked && selectedSigningMode() === "ssh") {
                await applySigningConfig();
            }
        } catch (e) {
            printLog(`[ERR] ${e}`);
        }
    });

    btnPickGpgBinary.addEventListener("click", async () => {
        try {
            const picked = await invoke<string | null>("pick_gpg_program_file");
            if (!picked) {
                printLog("[SYSTEM] GPG program selection cancelled.");
                return;
            }
            manualGpgProgramPath = picked;
            renderGpgOptions();
            gpgBinarySelect.value = MANUAL_OPTION_VALUE;
            printLog(`[SYSTEM] Manual GPG program selected: ${picked}`);

            if (signingEnabledCheckbox.checked && selectedSigningMode() === "gpg") {
                await applySigningConfig();
            }
        } catch (e) {
            printLog(`[ERR] ${e}`);
        }
    });

    setupSigningEnabledCheckbox({
        signingEnabledCheckbox,
        signingDisableConfirmOverlay,
        applySigningConfig,
        printLog
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

    setupBtnStageSelected({
        btnStageSelected,
        selectedUnstagedPaths,
        refreshFileList,
        printLog
    });

    setupBtnStageAll({
        btnStageAll,
        selectedUnstagedPaths,
        refreshFileList,
        printLog
    });

    setupBtnCommit({
        btnCommit,
        commitMessageEl,
        refreshFileList,
        printLog
    });

    setupBtnPush({
        btnPush,
        forcePushCheckbox,
        forcePushConfirmOverlay,
        doPush
    });

    setupForcePushCheckbox({
        forcePushCheckbox,
        forceModeConfirmOverlay,
        applyForcePushVisualState,
        printLog
    });

    setupBtnForceModeCancel({
        btnForceModeCancel,
        forceModeConfirmOverlay,
        applyForcePushVisualState,
        printLog
    });

    setupBtnForceModeConfirm({
        btnForceModeConfirm,
        forceModeConfirmOverlay,
        applyForcePushVisualState,
        printLog
    });

    setupBtnForcePushCancel({
        btnForcePushCancel,
        forcePushConfirmOverlay,
        printLog
    });

    setupBtnForcePushConfirm({
        btnForcePushConfirm,
        forcePushConfirmOverlay,
        doPush
    });

    setupBtnQuickDeploy({
        btnQuickDeploy,
        commitMessageEl,
        refreshFileList,
        printLog
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

    setupBtnRemoteCancel({
        btnRemoteCancel,
        remoteConfirmOverlay
    });

    setupBtnRemoteConfirm({
        btnRemoteConfirm,
        remoteConfirmOverlay,
        remoteUrlInput,
        printLog,
        isValidGitRemoteUrl,
        refreshRemoteList
    });

    return {
        setActiveRepoPath: (path: string) => {
            setActiveRepoPathInternal(path);
        }
    } satisfies ButtonHandlersApi;
};
