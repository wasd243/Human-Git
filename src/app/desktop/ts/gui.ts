import "../css/components.css";
import "../css/panels.css";

import {listen} from "@tauri-apps/api/event";
import {backgroundAnimation} from "./modules/background";
import {leftUI} from "./modules/leftUI";
import {printLog} from "./modules/log";
import {createRefreshFileList} from "./modules/refreshFileList";
import {setupEventListeners, fetchInitialStats, type MutationPayload} from "./modules/listener";
import {setupButtonHandlers} from "./modules/buttons";

// UI elements
const insEl = document.getElementById("ins-value")!;
const delEl = document.getElementById("del-value")!;

const syncBtn = document.getElementById("btn-sync")!;
const btnShowChanges = document.getElementById("btn-show-changes")!;
const btnGitInit = document.getElementById("btn-git-init")!;
const btnOpenPullUI = document.getElementById("btn-open-pull-ui")!;
const topUI = document.getElementById("top-ui")!;
const bottomUI = document.getElementById("bottom-ui")!;
const rightUI = document.getElementById("right-ui")!;
const btnCloseTopUI = document.getElementById("btn-close-top-ui")!;
const btnCloseBottomUI = document.getElementById("btn-close-bottom-ui")!;
const btnCloseRightUI = document.getElementById("btn-close-right-ui")!;
const btnDoGitInit = document.getElementById("btn-do-git-init")!;
const btnChooseFolder = document.getElementById("btn-choose-folder")!;
const btnPullAction = document.getElementById("btn-pull-action")!;
const btnRemoteAction = document.getElementById("btn-remote-action")!;
const remoteInputPanel = document.getElementById("remote-input-panel")!;
const remoteUrlInput = document.getElementById("remote-url-input") as HTMLTextAreaElement;
const remoteListEl = document.getElementById("remote-list")!;
const pullConfirmOverlay = document.getElementById("pull-confirm-overlay")!;
const btnPullCancel = document.getElementById("btn-pull-cancel")!;
const btnPullConfirm = document.getElementById("btn-pull-confirm")!;
const remoteConfirmOverlay = document.getElementById("remote-confirm-overlay")!;
const btnRemoteCancel = document.getElementById("btn-remote-cancel")!;
const btnRemoteConfirm = document.getElementById("btn-remote-confirm")!;
const fileListEl = document.getElementById("file-list")!;
const btnStageSelected = document.getElementById("btn-stage-selected")!;
const btnStageAll = document.getElementById("btn-stage-all")!;
const btnQuickDeploy = document.getElementById("btn-quick-deploy") as HTMLButtonElement;
const btnCommit = document.getElementById("btn-commit")!;
const btnPush = document.getElementById("btn-push")!;
const forcePushCheckbox = document.getElementById("chk-force-push") as HTMLInputElement;
const forcePushToggleLabel = document.getElementById("force-push-toggle")!;
const forceModeConfirmOverlay = document.getElementById("force-mode-confirm-overlay")!;
const btnForceModeCancel = document.getElementById("btn-force-mode-cancel")!;
const btnForceModeConfirm = document.getElementById("btn-force-mode-confirm")!;
const forcePushConfirmOverlay = document.getElementById("force-push-confirm-overlay")!;
const btnForcePushCancel = document.getElementById("btn-force-push-cancel")!;
const btnForcePushConfirm = document.getElementById("btn-force-push-confirm")!;
const commitMessageEl = document.getElementById("commit-message") as HTMLTextAreaElement;

// staged section
const stagedSectionEl = document.createElement("div");
const stagedTitleEl = document.createElement("div");
const stagedListEl = document.createElement("div");

stagedSectionEl.id = "staged-files-section";
stagedTitleEl.id = "staged-files-title";
stagedListEl.id = "staged-file-list";
stagedTitleEl.textContent = "Staged changes";
stagedSectionEl.appendChild(stagedTitleEl);
stagedSectionEl.appendChild(stagedListEl);
commitMessageEl.insertAdjacentElement("afterend", stagedSectionEl);

// local state
const selectedUnstagedPaths = new Set<string>();

const setStats = (stats: MutationPayload) => {
    insEl.textContent = stats.insertions.toString();
    delEl.textContent = stats.deletions.toString();
};

const resetStats = () => {
    insEl.textContent = "0";
    delEl.textContent = "0";
};

const refreshFileList = createRefreshFileList({
    fileListEl,
    stagedListEl,
    btnQuickDeploy,
    selectedUnstagedPaths,
    printLog
});

setupEventListeners({
    setStats,
    printLog,
    refreshFileList,
    isTopUIVisible: () => topUI.classList.contains("show")
});

void fetchInitialStats({
    setStats,
    printLog
});

setupButtonHandlers({
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
    forcePushCheckbox,
    forcePushToggleLabel,
    forceModeConfirmOverlay,
    btnForceModeCancel,
    btnForceModeConfirm,
    forcePushConfirmOverlay,
    btnForcePushCancel,
    btnForcePushConfirm,
    commitMessageEl,
    selectedUnstagedPaths,
    refreshFileList,
    setStats,
    resetStats,
    printLog
});

void listen<{ ok: boolean; message: string }>("remote-add-result", (event) => {
    if (event.payload.ok) {
        printLog(`[SUCCESS] ${event.payload.message}`);
    } else {
        printLog(`[ERR] ${event.payload.message}`);
    }
});

printLog("[HumanGit] Engine Online.");

backgroundAnimation();
leftUI();

setInterval(async () => {
    if (topUI.classList.contains("show")) {
        await refreshFileList();
    }
}, 1000);
