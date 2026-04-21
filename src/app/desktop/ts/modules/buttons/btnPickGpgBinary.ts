import {invoke} from "@tauri-apps/api/core";

interface SetupBtnPickGpgBinaryParams {
    btnPickGpgBinary: HTMLElement;
    gpgBinarySelect: HTMLSelectElement;
    setManualGpgProgramPath: (path: string) => void;
    renderGpgOptions: () => void;
    signingEnabledCheckbox: HTMLInputElement;
    selectedSigningMode: () => "ssh" | "gpg";
    applySigningConfig: () => Promise<void>;
    printLog: (msg: string) => void;
    manualOptionValue: string;
}

export const setupBtnPickGpgBinary = ({
    btnPickGpgBinary,
    gpgBinarySelect,
    setManualGpgProgramPath,
    renderGpgOptions,
    signingEnabledCheckbox,
    selectedSigningMode,
    applySigningConfig,
    printLog,
    manualOptionValue
}: SetupBtnPickGpgBinaryParams) => {
    btnPickGpgBinary.addEventListener("click", async () => {
        try {
            const picked = await invoke<string | null>("pick_gpg_program_file");
            if (!picked) {
                printLog("[SYSTEM] GPG program selection cancelled.");
                return;
            }

            setManualGpgProgramPath(picked);
            renderGpgOptions();
            gpgBinarySelect.value = manualOptionValue;
            printLog(`[SYSTEM] Manual GPG program selected: ${picked}`);

            if (signingEnabledCheckbox.checked && selectedSigningMode() === "gpg") {
                await applySigningConfig();
            }
        } catch (e) {
            printLog(`[ERR] ${e}`);
        }
    });
};
