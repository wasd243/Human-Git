import {invoke} from "@tauri-apps/api/core";
import type {GpgBinaryInfo, SshKeyInfo} from "./types";
import {MANUAL_OPTION_VALUE} from "./types";
import {setupBtnPickSshKey} from "./btnPickSshKey";
import {setupBtnPickGpgBinary} from "./btnPickGpgBinary";
import {setupBtnSigningDisableCancel} from "./btnSigningDisableCancel";
import {setupBtnSigningDisableConfirm} from "./btnSigningDisableConfirm";
import {setSshSigningControlsVisible} from "./sshSigningControls";
import {setGpgSigningControlsVisible} from "./gpgSigningControls";
import {setSigningVerifiedBadgeVisible} from "./signingVerifiedBadge";
import {renderSshKeyOptions} from "./sshKeySelect";
import {renderGpgBinaryOptions} from "./gpgBinarySelect";
import {getGpgSigningKey} from "./gpgSigningKeyInput";
import {setSigningDisableConfirmOverlayVisible} from "./signingDisableConfirmOverlay";

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
        return value === MANUAL_OPTION_VALUE ? manualKeyPath : value;
    };

    const selectedGpgProgramPath = () => {
        const value = gpgBinarySelect.value?.trim();
        if (!value) return null;
        return value === MANUAL_OPTION_VALUE ? manualGpgProgramPath : value;
    };

    const updateSigningModeUI = () => {
        const useGpg = selectedSigningMode() === "gpg";
        setSshSigningControlsVisible(sshSigningControls, !useGpg);
        setGpgSigningControlsVisible(gpgSigningControls, useGpg);
    };

    const updateVerifiedBadge = () => {
        const selected = selectedSigningMode() === "gpg"
            ? !!selectedGpgProgramPath()
            : !!selectedKeyPath();
        const show = signingEnabledCheckbox.checked && selected;
        setSigningVerifiedBadgeVisible(signingVerifiedBadge, show);
    };

    const renderKeyOptions = () => {
        renderSshKeyOptions({
            sshKeySelect,
            detectedKeys,
            manualKeyPath,
            manualOptionValue: MANUAL_OPTION_VALUE
        });
        updateVerifiedBadge();
    };

    const renderGpgOptions = () => {
        renderGpgBinaryOptions({
            gpgBinarySelect,
            detectedGpgBinaries,
            manualGpgProgramPath,
            manualOptionValue: MANUAL_OPTION_VALUE
        });
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

            const signingKey = getGpgSigningKey(gpgSigningKeyInput);
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

        setupBtnPickSshKey({
            btnPickSshKey,
            sshKeySelect,
            setManualKeyPath: (path) => {
                manualKeyPath = path;
            },
            renderKeyOptions,
            signingEnabledCheckbox,
            selectedSigningMode,
            applySigningConfig,
            printLog,
            manualOptionValue: MANUAL_OPTION_VALUE
        });

        setupBtnPickGpgBinary({
            btnPickGpgBinary,
            gpgBinarySelect,
            setManualGpgProgramPath: (path) => {
                manualGpgProgramPath = path;
            },
            renderGpgOptions,
            signingEnabledCheckbox,
            selectedSigningMode,
            applySigningConfig,
            printLog,
            manualOptionValue: MANUAL_OPTION_VALUE
        });

        signingEnabledCheckbox.addEventListener("change", async () => {
            if (!signingEnabledCheckbox.checked) {
                setSigningDisableConfirmOverlayVisible(signingDisableConfirmOverlay, true);
                signingEnabledCheckbox.checked = true;
                return;
            }

            try {
                await applySigningConfig();
            } catch (e) {
                printLog(`[ERR] ${e}`);
            }
        });

        setupBtnSigningDisableCancel({
            btnSigningDisableCancel,
            signingDisableConfirmOverlay,
            signingEnabledCheckbox,
            updateVerifiedBadge
        });

        setupBtnSigningDisableConfirm({
            btnSigningDisableConfirm,
            signingDisableConfirmOverlay,
            signingEnabledCheckbox,
            applySigningConfig,
            printLog
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
