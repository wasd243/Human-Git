import {invoke} from "@tauri-apps/api/core";

export interface FileStatus {
    x: string;
    y: string;
    path: string;
}

interface CreateRefreshFileListParams {
    fileListEl: HTMLElement;
    stagedListEl: HTMLElement;
    btnQuickDeploy: HTMLButtonElement;
    selectedUnstagedPaths: Set<string>;
    printLog: (msg: string) => void;
}

const isStagedFile = (file: FileStatus) => file.x.trim() !== "" && file.x !== "?";

const updateSelectedPath = (selectedUnstagedPaths: Set<string>, path: string, checked: boolean) => {
    if (checked) {
        selectedUnstagedPaths.add(path);
    } else {
        selectedUnstagedPaths.delete(path);
    }
};

const captureSelectionFromDom = (fileListEl: HTMLElement, selectedUnstagedPaths: Set<string>) => {
    const checkedBoxes = fileListEl.querySelectorAll('input[type="checkbox"]:checked');
    checkedBoxes.forEach((cb) => {
        const path = (cb as HTMLInputElement).dataset.path;
        if (path) {
            selectedUnstagedPaths.add(path);
        }
    });
};

const createEmptyRow = (message: string) => {
    const row = document.createElement("div");
    row.className = "file-item";

    const text = document.createElement("span");
    text.className = "file-path";
    text.textContent = message;

    row.appendChild(text);
    return row;
};

const createStatusSpan = (file: FileStatus) => {
    const status = document.createElement("span");
    status.className = "file-status";
    status.textContent = `[${file.x}${file.y}]`;
    return status;
};

const createPathSpan = (path: string) => {
    const pathSpan = document.createElement("span");
    pathSpan.className = "file-path";
    pathSpan.textContent = path;
    return pathSpan;
};

export const createRefreshFileList = ({
    fileListEl,
    stagedListEl,
    btnQuickDeploy,
    selectedUnstagedPaths,
    printLog
}: CreateRefreshFileListParams) => {
    return async () => {
        try {
            captureSelectionFromDom(fileListEl, selectedUnstagedPaths);

            const files = await invoke<FileStatus[]>("get_working_status");
            const stagedFiles = files.filter(isStagedFile);
            const unstagedFiles = files.filter(file => !isStagedFile(file));

            const unstagedPathSet = new Set(unstagedFiles.map(file => file.path));
            Array.from(selectedUnstagedPaths).forEach(path => {
                if (!unstagedPathSet.has(path)) {
                    selectedUnstagedPaths.delete(path);
                }
            });

            fileListEl.replaceChildren();
            stagedListEl.replaceChildren();
            btnQuickDeploy.disabled = files.length === 0;

            if (unstagedFiles.length === 0) {
                fileListEl.appendChild(createEmptyRow("No unstaged changes."));
            }

            unstagedFiles.forEach(file => {
                const div = document.createElement("div");
                div.className = "file-item";
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.dataset.path = file.path;
                checkbox.checked = selectedUnstagedPaths.has(file.path);

                div.appendChild(checkbox);
                div.appendChild(createStatusSpan(file));
                div.appendChild(createPathSpan(file.path));

                checkbox.addEventListener("change", () => {
                    updateSelectedPath(selectedUnstagedPaths, file.path, checkbox.checked);
                });

                div.addEventListener("click", (e) => {
                    if ((e.target as HTMLElement).tagName !== "INPUT") {
                        checkbox.checked = !checkbox.checked;
                        updateSelectedPath(selectedUnstagedPaths, file.path, checkbox.checked);
                    }
                });

                fileListEl.appendChild(div);
            });

            if (stagedFiles.length === 0) {
                stagedListEl.appendChild(createEmptyRow("No staged changes."));
                return;
            }

            stagedFiles.forEach(file => {
                const div = document.createElement("div");
                div.className = "file-item";
                div.appendChild(createStatusSpan(file));
                div.appendChild(createPathSpan(file.path));
                stagedListEl.appendChild(div);
            });
        } catch (e) {
            fileListEl.replaceChildren();
            stagedListEl.replaceChildren();
            btnQuickDeploy.disabled = true;
            printLog(`[ERR] Failed to fetch file status: ${e}`);
        }
    };
};
