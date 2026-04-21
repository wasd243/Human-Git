import {applyFetchPruneVisualState} from "./fetchPruneToggleLabel";
import {setFetchPruneConfirmOverlayVisible} from "./fetchPruneConfirmOverlay";

interface SetupBtnFetchPruneCancelParams {
    btnFetchPruneCancel: HTMLElement;
    fetchPruneConfirmOverlay: HTMLElement;
    fetchPruneCheckbox: HTMLInputElement;
    fetchPruneToggleLabel: HTMLElement;
    btnFetchAction: HTMLElement;
    printLog: (msg: string) => void;
}

export const setupBtnFetchPruneCancel = ({
    btnFetchPruneCancel,
    fetchPruneConfirmOverlay,
    fetchPruneCheckbox,
    fetchPruneToggleLabel,
    btnFetchAction,
    printLog
}: SetupBtnFetchPruneCancelParams) => {
    btnFetchPruneCancel.addEventListener("click", () => {
        setFetchPruneConfirmOverlayVisible(fetchPruneConfirmOverlay, false);
        applyFetchPruneVisualState({
            fetchPruneCheckbox,
            fetchPruneToggleLabel,
            btnFetchAction,
            enabled: false
        });
        printLog("[SYSTEM] Cancel enabling fetch prune mode (-p).");
    });
};
