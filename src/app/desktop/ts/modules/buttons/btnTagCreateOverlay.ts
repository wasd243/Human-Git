import {CSS_CLASS_HIDDEN} from "./types";

export const setTagCreateOverlayVisible = (tagCreateConfirmOverlay: HTMLElement, visible: boolean) => {
    tagCreateConfirmOverlay.classList.toggle(CSS_CLASS_HIDDEN, !visible);
};
