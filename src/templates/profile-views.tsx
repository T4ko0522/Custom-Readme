import { getTheme } from "@/lib/colors";
import {
  svgRoot,
  svgAnimationStyles,
  escSvg,
  dynamicBarDefs,
  dynamicLeftBar,
  STATIC_BAR_GRADIENT,
} from "@/lib/svg";
import { incrementVisitors } from "@/lib/visitor-counter";
import type { TemplateDefinition } from "./types";

// ============================================================
// プロフィールビュー（訪問者カウンタ）専用のスタンドアロンテンプレート
//
// README に埋め込む視聴回数バッジ。画像が配信されるたびに INCR を実行する。
// ルート側で Cache-Control: no-store を付与することで、GitHub Camo や
// ブラウザキャッシュを素通りさせ、毎リクエストで Redis 更新を走らせる。
//
// 幅は label / count の長さから動的に算出し余白を作らない。route.tsx は
// props.__width を受け取り PNG 側でも同じ幅でレンダリングする。
// ============================================================

const H = 40;
const RADIUS = 8;
const BAR_W = 7;
const PAD_X = 12;
const DOT_SIZE = 6;
const DOT_GAP = 8;
const VALUE_GAP = 10;
const LABEL_FONT = 11;
const LABEL_TRACKING = 1.3;
const COUNT_FONT = 14;
const FALLBACK_W = 200;

/**
 * 指定フォントでのテキスト描画幅をざっくり推定する。
 * Edge ランタイムにテキスト計測 API は無いので、CJK はフル幅、Latin は
 * fontSize * 0.55（uppercase なら 0.62）で近似する。
 */
function estimateTextWidth(
  text: string,
  fontSize: number,
  letterSpacing = 0,
  uppercase = false,
): number {
  const latinRatio = uppercase ? 0.62 : 0.55;
  let w = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    const cjk =
      (code >= 0x3000 && code <= 0x9fff) ||
      (code >= 0xac00 && code <= 0xd7af) ||
      (code >= 0xff00 && code <= 0xffef);
    w += cjk ? fontSize : fontSize * latinRatio;
  }
  w += Math.max(0, text.length - 1) * letterSpacing;
  return w;
}

function computeWidth(label: string, countText: string): number {
  const labelW = estimateTextWidth(
    label.toUpperCase(),
    LABEL_FONT,
    LABEL_TRACKING,
    true,
  );
  const countW = estimateTextWidth(countText, COUNT_FONT, 0);
  return Math.ceil(
    BAR_W + PAD_X * 2 + DOT_SIZE + DOT_GAP + labelW + VALUE_GAP + countW,
  );
}

export const profileViews: TemplateDefinition = {
  name: "profile-views",
  description:
    "訪問者カウンタ単独のバッジカード。画像が配信されるたびに Redis を INCR し、キャッシュは無効化される。幅は label / count に合わせて自動で縮む。",
  width: FALLBACK_W,
  height: H,
  params: {
    id: {
      type: "string",
      required: true,
      description:
        "訪問者カウンタの Redis キー識別子（英数と ._- のみ、64文字以内。大小文字は区別されません）",
    },
    label: {
      type: "string",
      default: "Profile views",
      description: "表示ラベル（カウントの前に出す文字列）",
    },
    theme: {
      type: "string",
      default: "dark",
      description: "カラーテーマ",
      enum: ["dark", "light", "github"],
    },
  },

  noCache: true,

  fetchData: async (props) => {
    const id = (props.id as string).trim();
    const visitors = await incrementVisitors(id);
    const label = (props.label as string) || "Profile views";
    const countText =
      typeof visitors === "number" ? visitors.toLocaleString() : "—";
    const __width = computeWidth(label, countText);
    return { visitors, __width };
  },

  render: (props) => {
    const theme = getTheme(props.theme as string);
    const label = (props.label as string) || "Profile views";
    const visitors = props.visitors as number | null | undefined;
    const countText =
      typeof visitors === "number" ? visitors.toLocaleString() : "—";

    return (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: theme.bg,
          fontFamily: "Inter, Noto Sans JP",
          borderRadius: `${RADIUS}px`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            width: `${BAR_W}px`,
            background: STATIC_BAR_GRADIENT,
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: `${DOT_GAP}px`,
            padding: `0 ${PAD_X}px`,
          }}
        >
          <div
            style={{
              display: "flex",
              width: `${DOT_SIZE}px`,
              height: `${DOT_SIZE}px`,
              borderRadius: "999px",
              background: "#f97316",
            }}
          />
          <span
            style={{
              fontSize: `${LABEL_FONT}px`,
              fontWeight: 700,
              color: theme.subtext,
              textTransform: "uppercase",
              letterSpacing: `${LABEL_TRACKING}px`,
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
          <span
            style={{
              display: "flex",
              marginLeft: `${VALUE_GAP - DOT_GAP}px`,
              fontSize: `${COUNT_FONT}px`,
              fontWeight: 700,
              color: theme.text,
              letterSpacing: "-0.2px",
              whiteSpace: "nowrap",
            }}
          >
            {countText}
          </span>
        </div>
      </div>
    );
  },

  renderSvg: (props) => {
    const theme = getTheme(props.theme as string);
    const label = (props.label as string) || "Profile views";
    const visitors = props.visitors as number | null | undefined;
    const countText =
      typeof visitors === "number" ? visitors.toLocaleString() : "—";

    const W =
      typeof props.__width === "number" && props.__width > 0
        ? (props.__width as number)
        : computeWidth(label, countText);

    const contentX = BAR_W + PAD_X;
    const centerY = H / 2;

    const labelX = contentX + DOT_SIZE + DOT_GAP;
    const labelW = estimateTextWidth(
      label.toUpperCase(),
      LABEL_FONT,
      LABEL_TRACKING,
      true,
    );
    const countX = labelX + labelW + VALUE_GAP;

    return svgRoot(
      W,
      H,
      `
      ${svgAnimationStyles(theme)}
      ${dynamicBarDefs()}

      <defs>
        <clipPath id="card-clip">
          <rect width="${W}" height="${H}" rx="${RADIUS}" ry="${RADIUS}" />
        </clipPath>
      </defs>

      <g clip-path="url(#card-clip)">
        <rect width="${W}" height="${H}" fill="${theme.bg}" />

        ${dynamicLeftBar(H)}

        <!-- 脈動するドット -->
        <circle cx="${contentX + DOT_SIZE / 2}" cy="${centerY}" r="${DOT_SIZE / 2}" fill="#f97316"
          class="fade-in" style="animation-delay: 0.1s">
          <animate attributeName="opacity" values="1;0.35;1" dur="1.8s" repeatCount="indefinite" />
        </circle>

        <!-- ラベル -->
        <text x="${labelX}" y="${centerY + 4}" font-size="${LABEL_FONT}" font-weight="700"
          fill="${theme.subtext}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"
          letter-spacing="${LABEL_TRACKING}" class="fade-in-up" style="animation-delay: 0.2s">${escSvg(
            label.toUpperCase(),
          )}</text>

        <!-- カウント（ラベル直後に左寄せ） -->
        <text x="${countX}" y="${centerY + 5}" font-size="${COUNT_FONT}" font-weight="700"
          fill="${theme.text}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"
          letter-spacing="-0.2" class="fade-in-up" style="animation-delay: 0.2s">${escSvg(countText)}</text>
      </g>
    `,
    );
  },
};
