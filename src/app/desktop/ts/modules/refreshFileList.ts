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

            fileListEl.innerHTML = "";
            stagedListEl.innerHTML = "";
            btnQuickDeploy.disabled = files.length === 0;

            if (unstagedFiles.length === 0) {
                fileListEl.innerHTML = `<div class="file-item"><span class="file-path">No unstaged changes.</span></div>`;
            }

            unstagedFiles.forEach(file => {
                const div = document.createElement("div");
                div.className = "file-item";
                div.innerHTML = `
                <input type="checkbox" data-path="${file.path}">
                <span class="file-status">[${file.x}${file.y}]</span>
                <span class="file-path">${file.path}</span>
            `;

                const checkbox = div.querySelector("input") as HTMLInputElement;
                checkbox.checked = selectedUnstagedPaths.has(file.path);

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
                stagedListEl.innerHTML = `<div class="file-item"><span class="file-path">No staged changes.</span></div>`;
                return;
            }

            stagedFiles.forEach(file => {
                const div = document.createElement("div");
                div.className = "file-item";
                div.innerHTML = `
                <span class="file-status">[${file.x}${file.y}]</span>
                <span class="file-path">${file.path}</span>
            `;
                stagedListEl.appendChild(div);
            });
        } catch (e) {
            fileListEl.innerHTML = "";
            stagedListEl.innerHTML = "";
            btnQuickDeploy.disabled = true;
            printLog(`[ERR] Failed to fetch file status: ${e}`);
        }
    };
};
