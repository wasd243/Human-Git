import {invoke} from "@tauri-apps/api/core";

interface SetupBtnPickSshKeyParams {
    btnPickSshKey: HTMLElement;
    sshKeySelect: HTMLSelectElement;
    setManualKeyPath: (path: string) => void;
    renderKeyOptions: () => void;
    signingEnabledCheckbox: HTMLInputElement;
    selectedSigningMode: () => "ssh" | "gpg";
    applySigningConfig: () => Promise<void>;
    printLog: (msg: string) => void;
    manualOptionValue: string;
}

export const setupBtnPickSshKey = ({
    btnPickSshKey,
    sshKeySelect,
    setManualKeyPath,
    renderKeyOptions,
    signingEnabledCheckbox,
    selectedSigningMode,
    applySigningConfig,
    printLog,
    manualOptionValue
}: SetupBtnPickSshKeyParams) => {
    btnPickSshKey.addEventListener("click", async () => {
        try {
            const picked = await invoke<string | null>("pick_ssh_key_file");
            if (!picked) {
                printLog("[SYSTEM] SSH key file selection cancelled.");
                return;
            }

            setManualKeyPath(picked);
            renderKeyOptions();
            sshKeySelect.value = manualOptionValue;
            printLog(`[SYSTEM] Manual SSH key selected: ${picked}`);

            if (signingEnabledCheckbox.checked && selectedSigningMode() === "ssh") {
                await applySigningConfig();
            }
        } catch (e) {
            printLog(`[ERR] ${e}`);
        }
    });
};
