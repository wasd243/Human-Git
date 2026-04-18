export function backgroundAnimation() {
// Find the fullscreen background layer
    const bgCanvas = document.getElementById("千里江山图")!;

// Scroll speed controls
    let velocity = 0; // Current scrolling speed
    const maxSpeed = 2.8; // Maximum scrolling speed (px/frame)
    const idleSpeed = 0.37; // Slow auto-slide to the right in the center area, like the MC UI (px/frame)
    const edgeWidth = 0.2; // Edge zone that triggers scrolling (20% on each side)
// --- Scroll state management ---
    let pos1 = 0;
    let pos2 = 0;
    let lastVh = window.innerHeight; // Used to track the resize scale
    let isPositionsInitialized = false;
// Track the background image aspect ratio to calculate loop width
    let imgAspectRatio = 23.2; // Estimated ratio based on filename 51,3x1191,5_cm (1191.5 / 51.3)
    const bgImg = new Image();
// Fix URL extraction so filenames with parentheses are handled correctly
    const rawBgUrl = getComputedStyle(bgCanvas).backgroundImage || "";
    const cleanUrl = rawBgUrl.trim().replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
    bgImg.src = cleanUrl || 'assets/Wang_Ximeng._A_Thousand_Li_of_Rivers_and_Mountains._(Complete,_51,3x1191,5_cm)._1113._Palace_museum,_Beijing - 副本.jpg';

    bgImg.onload = () => {
        if (bgImg.height > 0) {
            imgAspectRatio = bgImg.width / bgImg.height;
        }
    };

// Function that updates position on each frame
    const animate = () => {
        // Even if Engine is not initialized, keep it moving, just without highlight
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        const imgWidth = vh * imgAspectRatio;

        if (imgWidth > 0) {
            // [Core fix] Compensate displacement when resizing (fullscreen/windowed switch)
            if (vh !== lastVh && isPositionsInitialized) {
                const scale = vh / lastVh;
                pos1 *= scale;
                pos2 *= scale;
                lastVh = vh;
            }

            // Initialization: start from the far right (end of the scroll)
            if (!isPositionsInitialized) {
                pos1 = vw - imgWidth; // Right-align the first image
                pos2 = vw;           // Place the second image right after it
                isPositionsInitialized = true;
                lastVh = vh;
            }

            // Step forward
            pos1 += velocity;
            pos2 += velocity;

            // --- Conveyor-style looping logic ---
            // Moved out to the left
            if (pos1 <= -imgWidth) pos1 = pos2 + imgWidth;
            if (pos2 <= -imgWidth) pos2 = pos1 + imgWidth + 1;

            // Moved out to the right
            if (pos1 >= vw) pos1 = pos2 - imgWidth;
            if (pos2 >= vw) pos2 = pos1 - imgWidth;

            // Render to the DOM
            if (isFinite(pos1) && isFinite(pos2)) {
                bgCanvas.style.backgroundPosition = `${pos1}px center, ${pos2}px center`;
            }
        }
        requestAnimationFrame(animate);
    };

// Start the animation loop
    animate();

    window.addEventListener("mousemove", (e) => {
        const width = window.innerWidth;
        if (width <= 0) return; // Defensive guard: prevent divide-by-zero Infinity

        const x = e.clientX;
        const ratio = x / width;

        if (ratio > (1 - edgeWidth)) {
            // Mouse near right edge: keep scrolling left
            // The farther right, the faster it scrolls
            velocity = -((ratio - (1 - edgeWidth)) / edgeWidth) * maxSpeed;
        } else if (ratio < edgeWidth) {
            // Mouse near left edge: keep scrolling right
            velocity = ((edgeWidth - ratio) / edgeWidth) * maxSpeed;
        } else {
            // In the center area: slow leftward slide like the MC UI
            velocity = idleSpeed;
        }
    });
}
