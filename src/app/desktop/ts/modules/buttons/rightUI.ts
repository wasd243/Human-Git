import {CSS_CLASS_HIDDEN, CSS_CLASS_SHOW} from "./types";
import {hideRemoteInputPanel} from "./remoteInputPanel";

interface OpenRightUIParams {
    rightUI: HTMLElement;
    pullConfirmOverlay: HTMLElement;
    remoteConfirmOverlay: HTMLElement;
    fetchPruneConfirmOverlay: HTMLElement;
    remoteInputPanel: HTMLElement;
    hideMainButtons: () => void;
}

interface CloseRightUIParams {
    rightUI: HTMLElement;
    pullConfirmOverlay: HTMLElement;
    remoteConfirmOverlay: HTMLElement;
    fetchPruneConfirmOverlay: HTMLElement;
    remoteInputPanel: HTMLElement;
    showMainButtons: () => void;
}

export const openRightUI = ({
    rightUI,
    pullConfirmOverlay,
    remoteConfirmOverlay,
    fetchPruneConfirmOverlay,
    remoteInputPanel,
    hideMainButtons
}: OpenRightUIParams) => {
    rightUI.classList.add(CSS_CLASS_SHOW);
    pullConfirmOverlay.classList.add(CSS_CLASS_HIDDEN);
    remoteConfirmOverlay.classList.add(CSS_CLASS_HIDDEN);
    fetchPruneConfirmOverlay.classList.add(CSS_CLASS_HIDDEN);
    hideRemoteInputPanel(remoteInputPanel);
    hideMainButtons();
};

export const closeRightUI = ({
    rightUI,
    pullConfirmOverlay,
    remoteConfirmOverlay,
    fetchPruneConfirmOverlay,
    remoteInputPanel,
    showMainButtons
}: CloseRightUIParams) => {
    rightUI.classList.remove(CSS_CLASS_SHOW);
    pullConfirmOverlay.classList.add(CSS_CLASS_HIDDEN);
    remoteConfirmOverlay.classList.add(CSS_CLASS_HIDDEN);
    fetchPruneConfirmOverlay.classList.add(CSS_CLASS_HIDDEN);
    hideRemoteInputPanel(remoteInputPanel);
    showMainButtons();
};
