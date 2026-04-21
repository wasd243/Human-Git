export const getGpgSigningKey = (gpgSigningKeyInput: HTMLInputElement) => {
    return gpgSigningKeyInput.value.trim() || null;
};
