import {setFetchPruneConfirmOverlayVisible} from "./fetchPruneConfirmOverlay";
import {CSS_CLASS_HIDDEN} from "./types";

interface SetupBtnPullActionParams {
    btnPullAction: HTMLElement;
    pullConfirmOverlay: HTMLElement;
}

export const setupBtnPullAction = ({btnPullAction, pullConfirmOverlay}: SetupBtnPullActionParams) => {
    btnPullAction.addEventListener("click", () => {
        pullConfirmOverlay.classList.remove(CSS_CLASS_HIDDEN);
        setFetchPruneConfirmOverlayVisible;
    });
};
