import type {MutationPayload} from "../listener";

export interface SetupButtonHandlersParams {
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
    signingModeSelect: HTMLSelectElement;
    sshSigningControls: HTMLElement;
    gpgSigningControls: HTMLElement;
    sshKeySelect: HTMLSelectElement;
    btnPickSshKey: HTMLElement;
    gpgBinarySelect: HTMLSelectElement;
    btnPickGpgBinary: HTMLElement;
    gpgSigningKeyInput: HTMLInputElement;
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

export interface ButtonHandlersApi {
    setActiveRepoPath: (path: string) => void;
}

export interface SshKeyInfo {
    file_name: string;
    full_path: string;
    comment: string;
}

export interface GpgBinaryInfo {
    file_name: string;
    full_path: string;
}

