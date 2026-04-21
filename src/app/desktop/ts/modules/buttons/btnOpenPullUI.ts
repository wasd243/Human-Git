import {openRightUI} from "./rightUI";

interface SetupBtnOpenPullUIParams {
    btnOpenPullUI: HTMLElement;
    rightUI: HTMLElement;
    pullConfirmOverlay: HTMLElement;
    remoteConfirmOverlay: HTMLElement;
    fetchPruneConfirmOverlay: HTMLElement;
    remoteInputPanel: HTMLElement;
    hideMainButtons: () => void;
    refreshRemoteList: () => Promise<void>;
}

export const setupBtnOpenPullUI = ({
    btnOpenPullUI,
    rightUI,
    pullConfirmOverlay,
    remoteConfirmOverlay,
    fetchPruneConfirmOverlay,
    remoteInputPanel,
    hideMainButtons,
    refreshRemoteList
}: SetupBtnOpenPullUIParams) => {
    btnOpenPullUI.addEventListener("click", () => {
        openRightUI({
            rightUI,
            pullConfirmOverlay,
            remoteConfirmOverlay,
            fetchPruneConfirmOverlay,
            remoteInputPanel,
            hideMainButtons
        });
        void refreshRemoteList();
    });
};
