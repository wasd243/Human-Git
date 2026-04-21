import {applyFetchPruneVisualState} from "./fetchPruneToggleLabel";
import {setFetchPruneConfirmOverlayVisible} from "./fetchPruneConfirmOverlay";

interface SetupFetchPruneCheckboxParams {
    fetchPruneCheckbox: HTMLInputElement;
    fetchPruneConfirmOverlay: HTMLElement;
    fetchPruneToggleLabel: HTMLElement;
    btnFetchAction: HTMLElement;
    printLog: (msg: string) => void;
}

export const setupFetchPruneCheckbox = ({
    fetchPruneCheckbox,
    fetchPruneConfirmOverlay,
    fetchPruneToggleLabel,
    btnFetchAction,
    printLog
}: SetupFetchPruneCheckboxParams) => {
    fetchPruneCheckbox.addEventListener("change", () => {
        if (fetchPruneCheckbox.checked) {
            setFetchPruneConfirmOverlayVisible(fetchPruneConfirmOverlay, true);
            applyFetchPruneVisualState({
                fetchPruneCheckbox,
                fetchPruneToggleLabel,
                btnFetchAction,
                enabled: false
            });
            return;
        }
        applyFetchPruneVisualState({
            fetchPruneCheckbox,
            fetchPruneToggleLabel,
            btnFetchAction,
            enabled: false
        });
        printLog("[SYSTEM] Fetch prune mode (-p) disabled.");
    });
};
