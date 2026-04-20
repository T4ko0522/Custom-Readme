import type { ThemeColors } from "./colors";

/** SVGのXMLヘッダーとルート要素を生成 */
export function svgRoot(
  width: number,
  height: number,
  content: string,
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${content}</svg>`;
}

/** 共通のCSS keyframes を生成 */
export function svgAnimationStyles(theme: ThemeColors): string {
  return `
    <style>
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideInLeft {
        from { opacity: 0; transform: translateX(-20px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes drawLine {
        from { stroke-dashoffset: 1000; }
        to { stroke-dashoffset: 0; }
      }
      @keyframes popIn {
        0% { opacity: 0; transform: scale(0.6); }
        70% { transform: scale(1.05); }
        100% { opacity: 1; transform: scale(1); }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      @keyframes glow {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 0.8; }
      }
      @keyframes gradientShift {
        0% { stop-color: ${theme.accent}; }
        50% { stop-color: ${theme.accent}cc; }
        100% { stop-color: ${theme.accent}; }
      }
      @keyframes breathe {
        0%, 100% { r: 70; stroke-opacity: 0.3; }
        50% { r: 72; stroke-opacity: 0.7; }
      }
      @keyframes shimmer {
        0% { offset: 0; }
        100% { offset: 1; }
      }
      @keyframes expandWidth {
        from { width: 0; }
        to { width: 100%; }
      }
      .fade-in-up {
        animation: fadeInUp 0.6s ease-out both;
      }
      .fade-in {
        animation: fadeIn 0.5s ease-out both;
      }
      .slide-in-left {
        animation: slideInLeft 0.6s ease-out both;
      }
      .pop-in {
        animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      }
      .float {
        animation: float 3s ease-in-out infinite;
      }
      .glow-pulse {
        animation: glow 2s ease-in-out infinite;
      }
    </style>
  `;
}

/** 背景用のグラデーション定義 */
export function svgGradientDefs(
  theme: ThemeColors,
  variant: "default" | "warm" | "cool" = "default",
): string {
  const warmColors = {
    c1: "#f97316",
    c2: "#fb923c",
    c3: "#f472b6",
    c4: "#a855f7",
  };

  const coolColors = {
    c1: "#06b6d4",
    c2: "#60a5fa",
    c3: "#a78bfa",
    c4: "#8b5cf6",
  };

  const colors = variant === "warm" ? warmColors : variant === "cool" ? coolColors : warmColors;

  return `
    <defs>
      <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${theme.bg}" />
        <stop offset="100%" stop-color="${theme.bg}" />
      </linearGradient>
      <linearGradient id="accent-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${colors.c1}">
          <animate attributeName="stop-color" values="${colors.c1};${colors.c2};${colors.c3};${colors.c1}" dur="4s" repeatCount="indefinite" />
        </stop>
        <stop offset="50%" stop-color="${colors.c2}">
          <animate attributeName="stop-color" values="${colors.c2};${colors.c3};${colors.c4};${colors.c2}" dur="4s" repeatCount="indefinite" />
        </stop>
        <stop offset="100%" stop-color="${colors.c3}">
          <animate attributeName="stop-color" values="${colors.c3};${colors.c4};${colors.c1};${colors.c3}" dur="4s" repeatCount="indefinite" />
        </stop>
      </linearGradient>
      <linearGradient id="accent-gradient-v" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${colors.c1}">
          <animate attributeName="stop-color" values="${colors.c1};${colors.c3};${colors.c1}" dur="3s" repeatCount="indefinite" />
        </stop>
        <stop offset="100%" stop-color="${colors.c3}">
          <animate attributeName="stop-color" values="${colors.c3};${colors.c1};${colors.c3}" dur="3s" repeatCount="indefinite" />
        </stop>
      </linearGradient>
      <radialGradient id="glow-gradient" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${colors.c1}" stop-opacity="0.15" />
        <stop offset="100%" stop-color="${colors.c1}" stop-opacity="0" />
      </radialGradient>
      <filter id="blur-sm">
        <feGaussianBlur stdDeviation="8" />
      </filter>
      <filter id="blur-lg">
        <feGaussianBlur stdDeviation="20" />
      </filter>
    </defs>
  `;
}

/** SVGテキスト要素のエスケープ */
export function escSvg(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ============================================================
// 動的な縦バー（layered rainbow river）
// ============================================================

/**
 * 動的バー用のグラデーション定義（<defs>内に配置）
 *
 * フルスペクトラムのレインボーグラデを2層、位相と方向と速度を変えて用意する。
 * 片方は下方向へ、もう片方は上方向へ、周期比を 5:8（黄金比に近い非整数比）に設定。
 * `spreadMethod="repeat"` で無限にタイル化されるため、translate 量を1周期ぶんに
 * 合わせればシームレスループになる。2層を screen ブレンドで重ねると、
 * 波同士がすれ違うような自然な干渉が生まれる。
 */
export function dynamicBarDefs(): string {
  // 1周期の長さ（px）。長めに取って色の変化をゆるやかに感じさせる
  const PERIOD = 360;

  return `
    <defs>
      <!-- プライマリ: フルスペクトラム・レインボー（下方向へゆっくり流れる） -->
      <linearGradient id="flow-bar-v"
        gradientUnits="userSpaceOnUse"
        x1="0" y1="0"
        x2="0" y2="${PERIOD}"
        spreadMethod="repeat">
        <stop offset="0%"   stop-color="#f97316" />
        <stop offset="14%"  stop-color="#fb923c" />
        <stop offset="28%"  stop-color="#fbbf24" />
        <stop offset="42%"  stop-color="#f472b6" />
        <stop offset="56%"  stop-color="#ec4899" />
        <stop offset="70%"  stop-color="#a855f7" />
        <stop offset="85%"  stop-color="#ec4899" />
        <stop offset="100%" stop-color="#f97316" />
        <animateTransform
          attributeName="gradientTransform"
          type="translate"
          from="0 0"
          to="0 ${PERIOD}"
          dur="5s"
          repeatCount="indefinite" />
      </linearGradient>

      <!-- セカンダリ: 位相オフセット + 逆方向・遅速。干渉波として重ねる -->
      <linearGradient id="flow-bar-v-2"
        gradientUnits="userSpaceOnUse"
        x1="0" y1="0"
        x2="0" y2="${PERIOD}"
        spreadMethod="repeat">
        <stop offset="0%"   stop-color="#fbbf24" />
        <stop offset="22%"  stop-color="#f472b6" />
        <stop offset="50%"  stop-color="#a855f7" />
        <stop offset="78%"  stop-color="#ec4899" />
        <stop offset="100%" stop-color="#fbbf24" />
        <animateTransform
          attributeName="gradientTransform"
          type="translate"
          from="0 ${PERIOD}"
          to="0 0"
          dur="8s"
          repeatCount="indefinite" />
      </linearGradient>

      <!-- 横方向アクセント（区切り線用） -->
      <linearGradient id="divider-h" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#f97316" stop-opacity="0.8" />
        <stop offset="50%" stop-color="#f472b6" stop-opacity="0.4" />
        <stop offset="100%" stop-color="#a855f7" stop-opacity="0" />
      </linearGradient>
    </defs>
  `;
}

/**
 * 動的左バー：2層レインボーの screen 合成で自然な縦フロー。
 *
 * 光の筋などの人工的なオーバーレイは使わず、色そのものの流れで動きを表現。
 * Primary（下向き5秒）と Secondary（上向き8秒）が重なり合うことで、
 * 同じ瞬間が二度訪れない有機的な虹が生まれる。
 */
export function dynamicLeftBar(H: number): string {
  return `
    <rect x="0" y="0" width="7" height="${H}" fill="url(#flow-bar-v)" />
    <rect x="0" y="0" width="7" height="${H}" fill="url(#flow-bar-v-2)" opacity="0.42" style="mix-blend-mode: screen" />
  `;
}

/** PNG（Satori）用の静的な左バー背景スタイル */
export const STATIC_BAR_GRADIENT =
  "linear-gradient(180deg, #f97316, #fb923c, #f472b6, #a855f7)";
