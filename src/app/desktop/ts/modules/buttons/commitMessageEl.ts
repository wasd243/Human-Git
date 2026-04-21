export const getCommitMessage = (commitMessageEl: HTMLTextAreaElement) => commitMessageEl.value;

export const getTrimmedCommitMessage = (commitMessageEl: HTMLTextAreaElement) => commitMessageEl.value.trim();

export const clearCommitMessage = (commitMessageEl: HTMLTextAreaElement) => {
    commitMessageEl.value = "";
};
