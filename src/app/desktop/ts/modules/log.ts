const bgCanvas = document.getElementById("千里江山图")!;
let isInitialized = false;

const ensureConsoleEl = () => {
    let consoleEl = document.getElementById("console-output");
    if (consoleEl) {
        return consoleEl;
    }

    consoleEl = document.createElement("div");
    consoleEl.id = "console-output";

    const leftPanel = document.getElementById("left-ui");
    if (leftPanel) {
        leftPanel.appendChild(consoleEl);
    } else {
        document.body.appendChild(consoleEl);
    }

    return consoleEl;
};

export function printLog(msg: string) {
    const p = document.createElement("p");

    // Simple log-color parsing logic (reusing the previous design approach)
    if (msg.startsWith("[SYSTEM]")) p.className = "log-system";
    else if (msg.startsWith("[ERR]")) p.className = "log-err";
    else if (msg.startsWith("[GIT]")) p.className = "log-git";
    else if (msg.startsWith("[SUCCESS]")) p.className = "log-success";
    else if (msg.startsWith("[EVENT]")) p.className = "log-event";

    p.textContent = `> ${msg}`;

    const consoleEl = ensureConsoleEl();
    consoleEl.prepend(p);

    bgCanvas.classList.add("engine-active");

    isInitialized = true;
}
