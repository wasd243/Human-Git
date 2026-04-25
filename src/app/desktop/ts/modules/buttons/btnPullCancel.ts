import {CSS_CLASS_HIDDEN} from "./types";

interface SetupBtnPullCancelParams {
    btnPullCancel: HTMLElement;
    pullConfirmOverlay: HTMLElement;
}

export const setupBtnPullCancel = ({btnPullCancel, pullConfirmOverlay}: SetupBtnPullCancelParams) => {
    btnPullCancel.addEventListener("click", () => {
        pullConfirmOverlay.classList.add(CSS_CLASS_HIDDEN);
    });
};
