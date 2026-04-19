export interface RepoContextInfoApi {
    update: (path: string | null) => void;
}

const FOLDER_VALUE_ID = "repo-context-folder";
const REPO_VALUE_ID = "repo-context-repo";

const getBaseName = (path: string) => {
    const normalized = path.trim().replace(/[\\/]+$/, "");
    if (!normalized) {
        return "N/A";
    }

    const segments = normalized.split(/[\\/]/).filter(Boolean);
    return segments.length > 0 ? segments[segments.length - 1] : normalized;
};

const createRepoContextRow = (labelText: string, valueId: string, defaultText: string) => {
    const row = document.createElement("div");
    row.className = "repo-context-row";

    const label = document.createElement("span");
    label.className = "label";
    label.textContent = labelText;

    const value = document.createElement("span");
    value.id = valueId;
    value.className = "value";
    value.textContent = defaultText;

    row.appendChild(label);
    row.appendChild(value);

    return {row, value};
};

const ensureRepoContextInfoElements = () => {
    let panel = document.getElementById("repo-context-info");
    if (!panel) {
        panel = document.createElement("div");
        panel.id = "repo-context-info";
        document.body.appendChild(panel);
    }

    let folderEl = panel.querySelector(`#${FOLDER_VALUE_ID}`) as HTMLElement | null;
    if (!folderEl) {
        const folderRow = createRepoContextRow("Folder", FOLDER_VALUE_ID, "No folder selected");
        panel.appendChild(folderRow.row);
        folderEl = folderRow.value;
    }

    let repoEl = panel.querySelector(`#${REPO_VALUE_ID}`) as HTMLElement | null;
    if (!repoEl) {
        const repoRow = createRepoContextRow("Repo", REPO_VALUE_ID, "No repo selected");
        panel.appendChild(repoRow.row);
        repoEl = repoRow.value;
    }

    return {folderEl, repoEl};
};

export const createRepoContextInfo = (): RepoContextInfoApi => {
    const {folderEl, repoEl} = ensureRepoContextInfoElements();

    return {
        update: (path: string | null) => {
            if (!path) {
                folderEl.textContent = "No folder selected";
                repoEl.textContent = "No repo selected";
                return;
            }

            const folderName = getBaseName(path);
            folderEl.textContent = folderName;
            repoEl.textContent = folderName;
        }
    };
};
