import "../css/components.css";
import "../css/panels.css";

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
const pullConfirmOverlay = document.getElementById("pull-confirm-overlay")!;
const btnPullCancel = document.getElementById("btn-pull-cancel")!;
const btnPullConfirm = document.getElementById("btn-pull-confirm")!;
const fileListEl = document.getElementById("file-list")!;
const btnStageSelected = document.getElementById("btn-stage-selected")!;
const btnStageAll = document.getElementById("btn-stage-all")!;
const btnQuickDeploy = document.getElementById("btn-quick-deploy") as HTMLButtonElement;
const btnCommit = document.getElementById("btn-commit")!;
const btnPush = document.getElementById("btn-push")!;
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
});

printLog("[HumanGit] Engine Online.");

backgroundAnimation();
leftUI();

setInterval(async () => {
    if (topUI.classList.contains("show")) {
        await refreshFileList();
    }
}, 1000);
