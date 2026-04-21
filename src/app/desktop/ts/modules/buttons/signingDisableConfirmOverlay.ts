import {CSS_CLASS_HIDDEN} from "./types";

export const setSigningDisableConfirmOverlayVisible = (signingDisableConfirmOverlay: HTMLElement, visible: boolean) => {
    signingDisableConfirmOverlay.classList.toggle(CSS_CLASS_HIDDEN, !visible);
};
