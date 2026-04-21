import {applyFetchPruneVisualState} from "./fetchPruneToggleLabel";
import {setFetchPruneConfirmOverlayVisible} from "./fetchPruneConfirmOverlay";

interface SetupBtnFetchPruneConfirmParams {
    btnFetchPruneConfirm: HTMLElement;
    fetchPruneConfirmOverlay: HTMLElement;
    fetchPruneCheckbox: HTMLInputElement;
    fetchPruneToggleLabel: HTMLElement;
    btnFetchAction: HTMLElement;
    printLog: (msg: string) => void;
}

export const setupBtnFetchPruneConfirm = ({
    btnFetchPruneConfirm,
    fetchPruneConfirmOverlay,
    fetchPruneCheckbox,
    fetchPruneToggleLabel,
    btnFetchAction,
    printLog
}: SetupBtnFetchPruneConfirmParams) => {
    btnFetchPruneConfirm.addEventListener("click", () => {
        setFetchPruneConfirmOverlayVisible(fetchPruneConfirmOverlay, false);
        applyFetchPruneVisualState({
            fetchPruneCheckbox,
            fetchPruneToggleLabel,
            btnFetchAction,
            enabled: true
        });
        printLog("[SYSTEM] Fetch prune mode (-p) enabled.");
    });
};
