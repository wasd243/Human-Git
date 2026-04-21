import {CSS_CLASS_HIDDEN} from "./types";

export const showRemoteInputPanel = (remoteInputPanel: HTMLElement) => {
    remoteInputPanel.classList.remove(CSS_CLASS_HIDDEN);
};

export const hideRemoteInputPanel = (remoteInputPanel: HTMLElement) => {
    remoteInputPanel.classList.add(CSS_CLASS_HIDDEN);
};

export const isRemoteInputPanelHidden = (remoteInputPanel: HTMLElement) => {
    return remoteInputPanel.classList.contains(CSS_CLASS_HIDDEN);
};
