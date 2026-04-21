import {CSS_CLASS_HIDDEN} from "./types";

export const setGpgSigningControlsVisible = (gpgSigningControls: HTMLElement, visible: boolean) => {
    gpgSigningControls.classList.toggle(CSS_CLASS_HIDDEN, !visible);
};
