import type {SshKeyInfo} from "./types";

const createKeyLabel = (k: SshKeyInfo) =>
    k.comment?.trim().length ? `${k.file_name} — ${k.comment}` : k.file_name;

interface RenderSshKeyOptionsParams {
    sshKeySelect: HTMLSelectElement;
    detectedKeys: SshKeyInfo[];
    manualKeyPath: string | null;
    manualOptionValue: string;
}

export const renderSshKeyOptions = ({
    sshKeySelect,
    detectedKeys,
    manualKeyPath,
    manualOptionValue
}: RenderSshKeyOptionsParams) => {
    const previousValue = sshKeySelect.value;
    sshKeySelect.replaceChildren();

    if (detectedKeys.length === 0 && !manualKeyPath) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "No SSH key detected";
        sshKeySelect.appendChild(opt);
        sshKeySelect.disabled = true;
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
        opt.value = manualOptionValue;
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
};
