import {CSS_CLASS_HIDDEN} from "./types";

export const setForcePushConfirmOverlayVisible = (forcePushConfirmOverlay: HTMLElement, visible: boolean) => {
    forcePushConfirmOverlay.classList.toggle(CSS_CLASS_HIDDEN, !visible);
};
