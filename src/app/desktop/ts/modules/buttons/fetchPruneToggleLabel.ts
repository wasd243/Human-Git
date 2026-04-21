interface ApplyFetchPruneVisualStateParams {
    fetchPruneCheckbox: HTMLInputElement;
    fetchPruneToggleLabel: HTMLElement;
    btnFetchAction: HTMLElement;
    enabled: boolean;
}

export const applyFetchPruneVisualState = ({
    fetchPruneCheckbox,
    fetchPruneToggleLabel,
    btnFetchAction,
    enabled
}: ApplyFetchPruneVisualStateParams) => {
    fetchPruneCheckbox.checked = enabled;
    fetchPruneToggleLabel.classList.toggle("danger", enabled);
    btnFetchAction.classList.toggle("prune-danger", enabled);
};
