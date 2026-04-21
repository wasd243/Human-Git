import {CSS_CLASS_HIDDEN} from "./types";

export const setSshSigningControlsVisible = (sshSigningControls: HTMLElement, visible: boolean) => {
    sshSigningControls.classList.toggle(CSS_CLASS_HIDDEN, !visible);
};
