export const applyForcePushToggleLabelState = (forcePushToggleLabel: HTMLElement, enabled: boolean) => {
    forcePushToggleLabel.classList.toggle("danger", enabled);
};
