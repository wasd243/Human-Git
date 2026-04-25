interface SetupBtnDeleteTagCancelParams {
    btnTagDeleteCancel: HTMLElement;
    tagDeleteConfirmOverlay: HTMLElement;
    tagDeleteNameInput: HTMLTextAreaElement;
}

export const setupBtnDeleteTagCancel = ({
    btnTagDeleteCancel,
    tagDeleteConfirmOverlay,
    tagDeleteNameInput
}: SetupBtnDeleteTagCancelParams) => {
    btnTagDeleteCancel.addEventListener("click", () => {
        tagDeleteNameInput.value = "";
        tagDeleteConfirmOverlay.classList.add("hidden");
    });
};
