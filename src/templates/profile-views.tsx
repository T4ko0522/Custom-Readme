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
// ============================================================

const W = 360;
const H = 100;

export const profileViews: TemplateDefinition = {
  name: "profile-views",
  description:
    "訪問者カウンタ単独のバッジカード。画像が配信されるたびに Redis を INCR し、キャッシュは無効化される。",
  width: W,
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
    return { visitors };
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
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "7px",
            background: STATIC_BAR_GRADIENT,
          }}
        />

        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            gap: "14px",
            padding: "0 28px",
          }}
        >
          <div
            style={{
              display: "flex",
              width: "10px",
              height: "10px",
              borderRadius: "999px",
              background: "#f97316",
            }}
          />
          <span
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: theme.subtext,
              textTransform: "uppercase",
              letterSpacing: "1.5px",
            }}
          >
            {label}
          </span>
          <span
            style={{
              display: "flex",
              marginLeft: "auto",
              fontSize: "28px",
              fontWeight: 700,
              color: theme.text,
              letterSpacing: "-0.5px",
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

    const barW = 7;
    const padX = 28;
    const contentX = barW + padX;
    const centerY = H / 2;

    const RADIUS = 12;

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
        <circle cx="${contentX + 5}" cy="${centerY}" r="5" fill="#f97316"
          class="fade-in" style="animation-delay: 0.1s">
          <animate attributeName="opacity" values="1;0.35;1" dur="1.8s" repeatCount="indefinite" />
        </circle>

        <!-- ラベル -->
        <text x="${contentX + 20}" y="${centerY + 5}" font-size="14" font-weight="700"
          fill="${theme.subtext}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"
          letter-spacing="1.5" class="fade-in-up" style="animation-delay: 0.2s">${escSvg(
            label.toUpperCase(),
          )}</text>

        <!-- カウント（右寄せ・ラベルと同じ fade-in-up / delay 0.2s） -->
        <text x="${W - padX}" y="${centerY + 10}" text-anchor="end" font-size="28" font-weight="700"
          fill="${theme.text}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"
          letter-spacing="-0.5" class="fade-in-up" style="animation-delay: 0.2s">${escSvg(countText)}</text>
      </g>
    `,
    );
  },
};
