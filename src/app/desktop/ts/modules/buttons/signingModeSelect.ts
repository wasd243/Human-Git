import {invoke} from "@tauri-apps/api/core";
import type {GpgBinaryInfo, SshKeyInfo} from "./types";

const createKeyLabel = (k: SshKeyInfo) =>
    k.comment?.trim().length ? `${k.file_name} — ${k.comment}` : k.file_name;

interface CreateSigningControllerParams {
    signingEnabledCheckbox: HTMLInputElement;
    signingModeSelect: HTMLSelectElement;
    sshSigningControls: HTMLElement;
    gpgSigningControls: HTMLElement;
    sshKeySelect: HTMLSelectElement;
    btnPickSshKey: HTMLElement;
    gpgBinarySelect: HTMLSelectElement;
    btnPickGpgBinary: HTMLElement;
    gpgSigningKeyInput: HTMLInputElement;
    signingDisableConfirmOverlay: HTMLElement;
    btnSigningDisableCancel: HTMLElement;
    btnSigningDisableConfirm: HTMLElement;
    signingVerifiedBadge: HTMLElement;
    printLog: (msg: string) => void;
}

export const createSigningController = ({
    signingEnabledCheckbox,
    signingModeSelect,
    sshSigningControls,
    gpgSigningControls,
    sshKeySelect,
    btnPickSshKey,
    gpgBinarySelect,
    btnPickGpgBinary,
    gpgSigningKeyInput,
    signingDisableConfirmOverlay,
    btnSigningDisableCancel,
    btnSigningDisableConfirm,
    signingVerifiedBadge,
    printLog
}: CreateSigningControllerParams) => {
    let detectedKeys: SshKeyInfo[] = [];
    let manualKeyPath: string | null = null;
    let detectedGpgBinaries: GpgBinaryInfo[] = [];
    let manualGpgProgramPath: string | null = null;

    const selectedSigningMode = () => signingModeSelect.value === "gpg" ? "gpg" : "ssh";

    const selectedKeyPath = () => {
        const value = sshKeySelect.value?.trim();
        if (!value) return null;
        return value === "__manual__" ? manualKeyPath : value;
    };

    const selectedGpgProgramPath = () => {
        const value = gpgBinarySelect.value?.trim();
        if (!value) return null;
        return value === "__manual__" ? manualGpgProgramPath : value;
    };

    const updateSigningModeUI = () => {
        const useGpg = selectedSigningMode() === "gpg";
        sshSigningControls.classList.toggle("hidden", useGpg);
        gpgSigningControls.classList.toggle("hidden", !useGpg);
    };

    const updateVerifiedBadge = () => {
        const selected = selectedSigningMode() === "gpg"
            ? !!selectedGpgProgramPath()
            : !!selectedKeyPath();
        const show = signingEnabledCheckbox.checked && selected;
        signingVerifiedBadge.classList.toggle("hidden", !show);
    };

    const renderKeyOptions = () => {
        const previousValue = sshKeySelect.value;
        sshKeySelect.replaceChildren();

        if (detectedKeys.length === 0 && !manualKeyPath) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "No SSH key detected";
            sshKeySelect.appendChild(opt);
            sshKeySelect.disabled = true;
            updateVerifiedBadge();
            return;
        }

        sshKeySelect.disabled = false;

        for (const key of detectedKeys) {
            const opt = document.createElement("option");
            opt.value = key.full_path;
            opt.textContent = createKeyLabel(key);
            sshKeySelect.appendChild(opt);
        }

        if (manualKeyPath) {
            const opt = document.createElement("option");
            opt.value = "__manual__";
            opt.textContent = `Manual key — ${manualKeyPath}`;
            sshKeySelect.appendChild(opt);
        }

        if (previousValue) {
            const hasPrevious = Array.from(sshKeySelect.options).some((o) => o.value === previousValue);
            if (hasPrevious) {
                sshKeySelect.value = previousValue;
            }
        }

        if (!sshKeySelect.value && sshKeySelect.options.length > 0) {
            sshKeySelect.selectedIndex = 0;
        }

        updateVerifiedBadge();
    };

    const renderGpgOptions = () => {
        const previousValue = gpgBinarySelect.value;
        gpgBinarySelect.replaceChildren();

        if (detectedGpgBinaries.length === 0 && !manualGpgProgramPath) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "No GPG binary detected";
            gpgBinarySelect.appendChild(opt);
            gpgBinarySelect.disabled = true;
            updateVerifiedBadge();
            return;
        }

        gpgBinarySelect.disabled = false;

        for (const bin of detectedGpgBinaries) {
            const opt = document.createElement("option");
            opt.value = bin.full_path;
            opt.textContent = `${bin.file_name} — ${bin.full_path}`;
            gpgBinarySelect.appendChild(opt);
        }

        if (manualGpgProgramPath) {
            const opt = document.createElement("option");
            opt.value = "__manual__";
            opt.textContent = `Manual program — ${manualGpgProgramPath}`;
            gpgBinarySelect.appendChild(opt);
        }

        if (previousValue) {
            const hasPrevious = Array.from(gpgBinarySelect.options).some((o) => o.value === previousValue);
            if (hasPrevious) {
                gpgBinarySelect.value = previousValue;
            }
        }

        if (!gpgBinarySelect.value && gpgBinarySelect.options.length > 0) {
            gpgBinarySelect.selectedIndex = 0;
        }

        updateVerifiedBadge();
    };

    const applySigningConfig = async () => {
        const mode = selectedSigningMode();

        if (!signingEnabledCheckbox.checked) {
            const result = mode === "gpg"
                ? await invoke<string>("disable_gpg_signing")
                : await invoke<string>("disable_ssh_signing");
            printLog(`[SUCCESS] ${result}`);
            updateVerifiedBadge();
            return;
        }

        if (mode === "gpg") {
            const gpgProgramPath = selectedGpgProgramPath();
            if (!gpgProgramPath) {
                printLog("[SYSTEM] Select a GPG program first.");
                updateVerifiedBadge();
                return;
            }

            const signingKey = gpgSigningKeyInput.value.trim() || null;
            const result = await invoke<string>("enable_gpg_signing", {gpgProgramPath, signingKey});
            printLog(`[SUCCESS] ${result}`);
            updateVerifiedBadge();
            return;
        }

        const keyPath = selectedKeyPath();
        if (!keyPath) {
            printLog("[SYSTEM] Select an SSH key first.");
            updateVerifiedBadge();
            return;
        }

        const result = await invoke<string>("enable_ssh_signing", {keyPath});
        printLog(`[SUCCESS] ${result}`);
        updateVerifiedBadge();
    };

    const refreshDetectedKeys = async () => {
        try {
            detectedKeys = await invoke<SshKeyInfo[]>("detect_ssh_keys");
            renderKeyOptions();
        } catch (e) {
            detectedKeys = [];
            renderKeyOptions();
            printLog(`[ERR] Failed to detect SSH keys: ${e}`);
        }
    };

    const refreshDetectedGpgPrograms = async () => {
        try {
            detectedGpgBinaries = await invoke<GpgBinaryInfo[]>("detect_gpg_binaries");
            renderGpgOptions();
        } catch (e) {
            detectedGpgBinaries = [];
            renderGpgOptions();
            printLog(`[ERR] Failed to detect GPG binaries: ${e}`);
        }
    };

    const bindEvents = () => {
        signingModeSelect.addEventListener("change", async () => {
            updateSigningModeUI();
            updateVerifiedBadge();
            if (!signingEnabledCheckbox.checked) return;
            try {
                await applySigningConfig();
            } catch (e) {
                printLog(`[ERR] ${e}`);
            }
        });

        sshKeySelect.addEventListener("change", async () => {
            updateVerifiedBadge();
            if (!signingEnabledCheckbox.checked || selectedSigningMode() !== "ssh") return;
            try {
                await applySigningConfig();
            } catch (e) {
                printLog(`[ERR] ${e}`);
            }
        });

        gpgBinarySelect.addEventListener("change", async () => {
            updateVerifiedBadge();
            if (!signingEnabledCheckbox.checked || selectedSigningMode() !== "gpg") return;
            try {
                await applySigningConfig();
            } catch (e) {
                printLog(`[ERR] ${e}`);
            }
        });

        gpgSigningKeyInput.addEventListener("change", async () => {
            if (!signingEnabledCheckbox.checked || selectedSigningMode() !== "gpg") return;
            try {
                await applySigningConfig();
            } catch (e) {
                printLog(`[ERR] ${e}`);
            }
        });

        btnPickSshKey.addEventListener("click", async () => {
            try {
                const picked = await invoke<string | null>("pick_ssh_key_file");
                if (!picked) {
                    printLog("[SYSTEM] SSH key file selection cancelled.");
                    return;
                }
                manualKeyPath = picked;
                renderKeyOptions();
                sshKeySelect.value = "__manual__";
                printLog(`[SYSTEM] Manual SSH key selected: ${picked}`);

                if (signingEnabledCheckbox.checked && selectedSigningMode() === "ssh") {
                    await applySigningConfig();
                }
            } catch (e) {
                printLog(`[ERR] ${e}`);
            }
        });

        btnPickGpgBinary.addEventListener("click", async () => {
            try {
                const picked = await invoke<string | null>("pick_gpg_program_file");
                if (!picked) {
                    printLog("[SYSTEM] GPG program selection cancelled.");
                    return;
                }
                manualGpgProgramPath = picked;
                renderGpgOptions();
                gpgBinarySelect.value = "__manual__";
                printLog(`[SYSTEM] Manual GPG program selected: ${picked}`);

                if (signingEnabledCheckbox.checked && selectedSigningMode() === "gpg") {
                    await applySigningConfig();
                }
            } catch (e) {
                printLog(`[ERR] ${e}`);
            }
        });

        signingEnabledCheckbox.addEventListener("change", async () => {
            if (!signingEnabledCheckbox.checked) {
                signingDisableConfirmOverlay.classList.remove("hidden");
                signingEnabledCheckbox.checked = true;
                return;
            }

            try {
                await applySigningConfig();
            } catch (e) {
                printLog(`[ERR] ${e}`);
            }
        });

        btnSigningDisableCancel.addEventListener("click", () => {
            signingDisableConfirmOverlay.classList.add("hidden");
            signingEnabledCheckbox.checked = true;
            updateVerifiedBadge();
        });

        btnSigningDisableConfirm.addEventListener("click", async () => {
            signingDisableConfirmOverlay.classList.add("hidden");
            signingEnabledCheckbox.checked = false;
            try {
                await applySigningConfig();
            } catch (e) {
                printLog(`[ERR] ${e}`);
            }
        });
    };

    return {
        bindEvents,
        refreshDetectedKeys,
        refreshDetectedGpgPrograms,
        applySigningConfig,
        updateVerifiedBadge,
        updateSigningModeUI
    };
};
