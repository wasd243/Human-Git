import {invoke} from "@tauri-apps/api/core";
import {
    ORIGIN_REMOTE,
    type ButtonHandlersApi,
    type SetupButtonHandlersParams
} from "./buttons/types";
import {setupBtnShowChanges} from "./buttons/btnShowChanges";
import {setupBtnPullAction} from "./buttons/btnPullAction";
import {setupBtnOpenPullUI} from "./buttons/btnOpenPullUI";
import {setupBtnOpenTagUI} from "./buttons/btnOpenTagUI";
import {setupBtnCloseTopUI} from "./buttons/btnCloseTopUI";
import {setupBtnChooseFolder} from "./buttons/btnChooseFolder";
import {setupBtnCloseRightUI} from "./buttons/btnCloseRightUI";
import {setupBtnCloseTagUI} from "./buttons/btnCloseTagUI";
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
import {setupBtnRemoteCancel} from "./buttons/btnRemoteCancel";
import {setupBtnRemoteConfirm} from "./buttons/btnRemoteConfirm";
import {setupBtnPullCancel} from "./buttons/btnPullCancel";
import {setupBtnPullConfirm} from "./buttons/btnPullConfirm";
import {applyForcePushToggleLabelState} from "./buttons/forcePushToggleLabel";
import {asFileListEl} from "./buttons/fileListEl";
import {asStagedListEl} from "./buttons/stagedListEl";
import {createSigningController} from "./buttons/signingModeSelect";
import {createRemoteMessageRow, isValidGitRemoteUrl, renderRemoteList} from "./buttons/printLog";
import {renderTagList, type TagInfo} from "./buttons/listTag";

export const setupButtonHandlers = ({
    btnShowChanges,
    btnGitInit,
    btnOpenPullUI,
    btnOpenTagUI,
    topUI,
    bottomUI,
    rightUI,
    tagUI,
    btnCloseTopUI,
    btnCloseBottomUI,
    btnCloseRightUI,
    btnCloseTagUI,
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
    tagListEl,
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

    const signingController = createSigningController({
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
        printLog
    });

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

    const invokePull = async (): Promise<string> => {
        return await invoke<string>("pull_changes");
    };

    const showMainButtons = () => {
        (btnGitInit as HTMLButtonElement).style.display = "";
        (btnOpenTagUI as HTMLButtonElement).style.display = "";
        (btnOpenPullUI as HTMLButtonElement).style.display = "";
        (btnShowChanges as HTMLButtonElement).style.display = "";
    };

    const hideMainButtons = () => {
        (btnGitInit as HTMLButtonElement).style.display = "none";
        (btnOpenTagUI as HTMLButtonElement).style.display = "none";
        (btnOpenPullUI as HTMLButtonElement).style.display = "none";
        (btnShowChanges as HTMLButtonElement).style.display = "none";
    };

    const refreshTagList = async () => {
        try {
            const tags = await invoke<TagInfo[]>("list_tags");
            renderTagList(tagListEl, tags);
        } catch (e) {
            tagListEl.innerHTML = `<div class="tag-item tag-item-empty">Failed to load tags.</div>`;
            printLog(`[ERR] Failed to fetch tags: ${e}`);
        }
    };

    applyForcePushVisualState(false);
    applyFetchPruneVisualState({
        fetchPruneCheckbox,
        fetchPruneToggleLabel,
        btnFetchAction,
        enabled: false
    });

    signingController.updateSigningModeUI();
    void signingController.refreshDetectedKeys();
    void signingController.refreshDetectedGpgPrograms();
    signingController.updateVerifiedBadge();
    signingController.bindEvents();

    setupBtnShowChanges({
        btnShowChanges,
        topUI,
        hideMainButtons,
        refreshDetectedKeys: signingController.refreshDetectedKeys,
        refreshDetectedGpgPrograms: signingController.refreshDetectedGpgPrograms,
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

    setupBtnOpenTagUI({
        btnOpenTagUI,
        tagUI,
        hideMainButtons,
        refreshTagList
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

    setupBtnCloseTagUI({
        btnCloseTagUI,
        tagUI,
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
        refreshDetectedKeys: signingController.refreshDetectedKeys,
        refreshDetectedGpgPrograms: signingController.refreshDetectedGpgPrograms,
        signingEnabledCheckbox,
        applySigningConfig: signingController.applySigningConfig,
        refreshRemoteList
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

    setupBtnPullCancel({
        btnPullCancel,
        pullConfirmOverlay
    });

    setupBtnPullConfirm({
        btnPullConfirm,
        pullConfirmOverlay,
        printLog,
        refreshFileList,
        invokePull
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
