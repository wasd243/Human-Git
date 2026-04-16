export function backgroundAnimation() {
// 找到全屏背景层
    const bgCanvas = document.getElementById("千里江山图")!;

// 滚动速度控制
    let velocity = 0; // 当前滚动的速度
    const maxSpeed = 2.8; // 最大滚动速度 (px/frame)
    const idleSpeed = 0.37; // 像 MC 界面那样的中间区域自动缓慢向右滑动 (px/frame)
    const edgeWidth = 0.2; // 屏幕边缘触发滚动的范围 (左右各 20%)
// --- 滚动状态管理 ---
    let pos1 = 0;
    let pos2 = 0;
    let lastVh = window.innerHeight; // 用于记录缩放比例
    let isPositionsInitialized = false;
// 记录背景图片的纵横比以计算循环宽度
    let imgAspectRatio = 23.2; // 根据文件名 51,3x1191,5_cm 预估的比例 (1191.5 / 51.3)
    const bgImg = new Image();
// 修正 URL 获取方式，确保能正确处理带括号的文件名
    const rawBgUrl = getComputedStyle(bgCanvas).backgroundImage || "";
    const cleanUrl = rawBgUrl.trim().replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
    bgImg.src = cleanUrl || 'assets/Wang_Ximeng._A_Thousand_Li_of_Rivers_and_Mountains._(Complete,_51,3x1191,5_cm)._1113._Palace_museum,_Beijing - 副本.jpg';

    bgImg.onload = () => {
        if (bgImg.height > 0) {
            imgAspectRatio = bgImg.width / bgImg.height;
        }
    };

// 每一帧更新位置的函数
    const animate = () => {
        // 即使没初始化 Engine，我们也让它动起来，只是不提亮
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        const imgWidth = vh * imgAspectRatio;

        if (imgWidth > 0) {
            // 【核心修复】处理窗口缩放（全屏/小窗切换）时的位移补偿
            if (vh !== lastVh && isPositionsInitialized) {
                const scale = vh / lastVh;
                pos1 *= scale;
                pos2 *= scale;
                lastVh = vh;
            }

            // 初始化：从最右侧（画卷结尾）开始
            if (!isPositionsInitialized) {
                pos1 = vw - imgWidth; // 第一张图右对齐
                pos2 = vw;           // 第二张图接在后面
                isPositionsInitialized = true;
                lastVh = vh;
            }

            // 步进
            pos1 += velocity;
            pos2 += velocity;

            // --- 履带式循环逻辑 ---
            // 向左挪出
            if (pos1 <= -imgWidth) pos1 = pos2 + imgWidth;
            if (pos2 <= -imgWidth) pos2 = pos1 + imgWidth + 1;

            // 向右挪出
            if (pos1 >= vw) pos1 = pos2 - imgWidth;
            if (pos2 >= vw) pos2 = pos1 - imgWidth;

            // 渲染到 DOM
            if (isFinite(pos1) && isFinite(pos2)) {
                bgCanvas.style.backgroundPosition = `${pos1}px center, ${pos2}px center`;
            }
        }
        requestAnimationFrame(animate);
    };

// 启动动画循环
    animate();

    window.addEventListener("mousemove", (e) => {
        const width = window.innerWidth;
        if (width <= 0) return; // 安全防御：防止除以 0 产生 Infinity

        const x = e.clientX;
        const ratio = x / width;

        if (ratio > (1 - edgeWidth)) {
            // 鼠标靠右：持续向左滚动
            // 越靠右速度越快
            velocity = -((ratio - (1 - edgeWidth)) / edgeWidth) * maxSpeed;
        } else if (ratio < edgeWidth) {
            // 鼠标靠左：持续向右滚动
            velocity = ((edgeWidth - ratio) / edgeWidth) * maxSpeed;
        } else {
            // 在中间区域：像 MC 界面那样的向左缓慢滑动
            velocity = idleSpeed;
        }
    });
}