import {CSS_CLASS_HIDDEN} from "./types";

export const setForceModeConfirmOverlayVisible = (forceModeConfirmOverlay: HTMLElement, visible: boolean) => {
    forceModeConfirmOverlay.classList.toggle(CSS_CLASS_HIDDEN, !visible);
};
