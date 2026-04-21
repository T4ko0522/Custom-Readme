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
const H = 56;

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
            gap: "10px",
            padding: "0 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              width: "8px",
              height: "8px",
              borderRadius: "999px",
              background: "#f97316",
            }}
          />
          <span
            style={{
              fontSize: "12px",
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
              fontSize: "18px",
              fontWeight: 700,
              color: theme.text,
              letterSpacing: "-0.3px",
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
    const padX = 20;
    const contentX = barW + padX;
    const centerY = H / 2;

    const RADIUS = 10;

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
        <circle cx="${contentX + 4}" cy="${centerY}" r="4" fill="#f97316"
          class="fade-in" style="animation-delay: 0.1s">
          <animate attributeName="opacity" values="1;0.35;1" dur="1.8s" repeatCount="indefinite" />
        </circle>

        <!-- ラベル -->
        <text x="${contentX + 18}" y="${centerY + 4}" font-size="12" font-weight="700"
          fill="${theme.subtext}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"
          letter-spacing="1.5" class="fade-in-up" style="animation-delay: 0.2s">${escSvg(
            label.toUpperCase(),
          )}</text>

        <!-- カウント（右寄せ） -->
        <text x="${W - padX}" y="${centerY + 6}" text-anchor="end" font-size="18" font-weight="700"
          fill="${theme.text}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"
          letter-spacing="-0.3" class="fade-in-up" style="animation-delay: 0.2s">${escSvg(countText)}</text>
      </g>
    `,
    );
  },
};
