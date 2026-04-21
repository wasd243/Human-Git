import type {GpgBinaryInfo} from "./types";

interface RenderGpgBinaryOptionsParams {
    gpgBinarySelect: HTMLSelectElement;
    detectedGpgBinaries: GpgBinaryInfo[];
    manualGpgProgramPath: string | null;
    manualOptionValue: string;
}

export const renderGpgBinaryOptions = ({
    gpgBinarySelect,
    detectedGpgBinaries,
    manualGpgProgramPath,
    manualOptionValue
}: RenderGpgBinaryOptionsParams) => {
    const previousValue = gpgBinarySelect.value;
    gpgBinarySelect.replaceChildren();

    if (detectedGpgBinaries.length === 0 && !manualGpgProgramPath) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "No GPG binary detected";
        gpgBinarySelect.appendChild(opt);
        gpgBinarySelect.disabled = true;
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
        opt.value = manualOptionValue;
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
};
