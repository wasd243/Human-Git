import {CSS_CLASS_HIDDEN} from "./types";

export const setFetchPruneConfirmOverlayVisible = (fetchPruneConfirmOverlay: HTMLElement, visible: boolean) => {
    fetchPruneConfirmOverlay.classList.toggle(CSS_CLASS_HIDDEN, !visible);
};
