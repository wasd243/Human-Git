import {closeRightUI} from "./rightUI";

interface SetupBtnCloseRightUIParams {
    btnCloseRightUI: HTMLElement;
    rightUI: HTMLElement;
    pullConfirmOverlay: HTMLElement;
    remoteConfirmOverlay: HTMLElement;
    fetchPruneConfirmOverlay: HTMLElement;
    remoteInputPanel: HTMLElement;
    showMainButtons: () => void;
}

export const setupBtnCloseRightUI = ({
    btnCloseRightUI,
    rightUI,
    pullConfirmOverlay,
    remoteConfirmOverlay,
    fetchPruneConfirmOverlay,
    remoteInputPanel,
    showMainButtons
}: SetupBtnCloseRightUIParams) => {
    btnCloseRightUI.addEventListener("click", () => {
        closeRightUI({
            rightUI,
            pullConfirmOverlay,
            remoteConfirmOverlay,
            fetchPruneConfirmOverlay,
            remoteInputPanel,
            showMainButtons
        });
    });
};
