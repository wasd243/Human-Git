const bgCanvas = document.getElementById("千里江山图")!;

const ensureLeftPanel = () => {
    let leftPanel = document.getElementById("left-ui");
    if (leftPanel) {
        return leftPanel;
    }

    leftPanel = document.createElement("div");
    leftPanel.id = "left-ui";
    document.body.appendChild(leftPanel);
    return leftPanel;
};

export function printLog(msg: string) {
    const p = document.createElement("p");
    p.classList.add("left-log-entry");

    if (msg.startsWith("[SYSTEM]")) p.classList.add("log-system");
    else if (msg.startsWith("[ERR]")) p.classList.add("log-err");
    else if (msg.startsWith("[GIT]")) p.classList.add("log-git");
    else if (msg.startsWith("[SUCCESS]")) p.classList.add("log-success");
    else if (msg.startsWith("[EVENT]")) p.classList.add("log-event");

    p.textContent = `> ${msg}`;

    const leftPanel = ensureLeftPanel();
    leftPanel.prepend(p);

    bgCanvas.classList.add("engine-active");
}
