import {CSS_CLASS_HIDDEN} from "./types";

export const setRemoteConfirmOverlayVisible = (remoteConfirmOverlay: HTMLElement, visible: boolean) => {
    remoteConfirmOverlay.classList.toggle(CSS_CLASS_HIDDEN, !visible);
};
