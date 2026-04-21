import {CSS_CLASS_HIDDEN} from "./types";

export const setSigningVerifiedBadgeVisible = (signingVerifiedBadge: HTMLElement, visible: boolean) => {
    signingVerifiedBadge.classList.toggle(CSS_CLASS_HIDDEN, !visible);
};
