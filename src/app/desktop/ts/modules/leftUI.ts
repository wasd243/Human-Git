const syncBtn = document.getElementById("btn-sync")!;
export function leftUI() {
    // --- UI Additions for SHADOW_SYNC ---
    const triggerBtn = document.createElement("button");
    triggerBtn.id = "top-left-sync-btn";
    triggerBtn.innerHTML = `<span class="gear-icon">⚙</span>`;
    document.body.appendChild(triggerBtn);

    const leftUI = document.createElement("div");
    leftUI.id = "left-ui";
    document.body.appendChild(leftUI);

// Move the original sync button into the new UI
    leftUI.appendChild(syncBtn);

// Interactions
    triggerBtn.addEventListener("click", () => {
        leftUI.classList.toggle("show");
    });
}