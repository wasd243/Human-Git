export const applyOnRepoContextChange = (onRepoContextChange: (path: string | null) => void, path: string | null) => {
    onRepoContextChange(path);
};
