import { getTheme } from "@/lib/colors";
import {
  svgRoot,
  svgAnimationStyles,
  escSvg,
  dynamicBarDefs,
  dynamicLeftBar,
  STATIC_BAR_GRADIENT,
} from "@/lib/svg";
import type { TemplateDefinition } from "./types";

// ============================================================
// 汎用ボタンバッジ
//
// 任意の画像返却 API（shields.io / skillicons.dev / 自作 API 等）を
// 左アイコンとして埋め込める横長ボタン。href は画像自体には含めず、
// プレビューページの Markdown 生成時に `[![](...)](href)` へ展開する。
//
// 幅はラベル長から動的に算出し余白を作らない。route.tsx は
// props.__width を受け取り PNG 側でも同じ幅でレンダリングする。
// ============================================================

const H = 56;
const RADIUS = 10;
const BAR_W = 7;
const ICON_SIZE = 22;
const GAP = 10;
const PAD_X = 18;
const FONT_SIZE = 16;
const FALLBACK_W = 140; // fetchData が走る前の meta 返却値

/** テーマ別のボタン表面色（bg より一段立体感を出す専用トーン） */
function buttonSurface(name: string | undefined): { top: string; bottom: string } {
  switch (name) {
    case "light":
      return { top: "#ffffff", bottom: "#f3f4f6" };
    case "github":
      return { top: "#21262d", bottom: "#161b22" };
    default:
      return { top: "#1f2937", bottom: "#111827" };
  }
}

/**
 * ラベルの描画幅をざっくり推定する。
 *
 * Edge ランタイムではテキスト計測 API が無いため、CJK はフル幅、Latin は
 * fontSize * 0.55 で近似する。最終的に padding で吸収できる程度の誤差。
 */
function estimateLabelWidth(label: string, fontSize: number): number {
  let w = 0;
  for (const ch of label) {
    const code = ch.codePointAt(0) ?? 0;
    const cjk =
      (code >= 0x3000 && code <= 0x9fff) ||
      (code >= 0xac00 && code <= 0xd7af) ||
      (code >= 0xff00 && code <= 0xffef);
    w += cjk ? fontSize : fontSize * 0.55;
  }
  return w;
}

function computeWidth(label: string, hasIcon: boolean): number {
  const textW = estimateLabelWidth(label, FONT_SIZE);
  const iconW = hasIcon ? ICON_SIZE + GAP : 0;
  return Math.ceil(BAR_W + PAD_X * 2 + iconW + textW);
}

function isSafeIconUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * 外部画像を fetch して data URI 化する。
 *
 * Satori（PNG）は外部 URL を苦手とし、SVG 出力でも GitHub Camo が外部 href
 * をブロックしがち。両出力で確実に表示するため Base64 に揃える。
 */
async function fetchIconDataUri(url: string): Promise<string | null> {
  if (!isSafeIconUrl(url)) return null;
  try {
    const res = await fetch(url, { headers: { Accept: "image/*" } });
    if (!res.ok) return null;
    const contentType =
      res.headers.get("content-type")?.split(";")[0].trim() || "image/png";
    const buf = await res.arrayBuffer();
    const b64 = Buffer.from(buf).toString("base64");
    return `data:${contentType};base64,${b64}`;
  } catch {
    return null;
  }
}

export const button: TemplateDefinition = {
  name: "button",
  description:
    "汎用ボタンバッジ。任意の画像返却 API をアイコンに、ラベル・リンク先・テーマを指定可能。幅はラベルに合わせて自動で縮む。",
  width: FALLBACK_W,
  height: H,
  params: {
    label: {
      type: "string",
      required: true,
      description: "ボタンに表示する文字列",
    },
    icon: {
      type: "string",
      default: "",
      description:
        "アイコン画像 URL（画像を返す API。http/https のみ。未指定ならラベルのみを左寄せ）",
    },
    href: {
      type: "string",
      default: "",
      description:
        "リンク先 URL（README 貼付時にリンク化。画像自体には含まれません）",
    },
    theme: {
      type: "string",
      default: "dark",
      description: "カラーテーマ",
      enum: ["dark", "light", "github"],
    },
  },

  fetchData: async (props) => {
    const iconUrl = ((props.icon as string) || "").trim();
    const icon = iconUrl ? await fetchIconDataUri(iconUrl) : null;
    const label = (props.label as string) || "";
    const __width = computeWidth(label, Boolean(icon));
    return { icon, __width };
  },

  render: (props) => {
    const theme = getTheme(props.theme as string);
    const surface = buttonSurface(props.theme as string);
    const icon = props.icon as string | null;
    const label = props.label as string;

    return (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: `linear-gradient(180deg, ${surface.top}, ${surface.bottom})`,
          border: `1px solid ${theme.border}`,
          borderRadius: `${RADIUS}px`,
          overflow: "hidden",
          fontFamily: "Inter, Noto Sans JP",
        }}
      >
        {/* 左レインボーバー（PNG では静的） */}
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
            flex: 1,
            alignItems: "center",
            justifyContent: "flex-start",
            gap: icon ? `${GAP}px` : "0px",
            padding: `0 ${PAD_X}px`,
          }}
        >
          {icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={icon}
              alt=""
              width={ICON_SIZE}
              height={ICON_SIZE}
              style={{ display: "flex", borderRadius: "4px" }}
            />
          )}
          <span
            style={{
              fontSize: `${FONT_SIZE}px`,
              fontWeight: 600,
              color: theme.text,
              letterSpacing: "0.2px",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
        </div>
      </div>
    );
  },

  renderSvg: (props) => {
    const theme = getTheme(props.theme as string);
    const surface = buttonSurface(props.theme as string);
    const icon = props.icon as string | null;
    const label = props.label as string;
    const labelEsc = escSvg(label);

    // fetchData 済みなら __width を使う。直接 renderSvg が呼ばれる万一の経路に備えて再計算にもフォールバック
    const W =
      typeof props.__width === "number" && props.__width > 0
        ? (props.__width as number)
        : computeWidth(label, Boolean(icon));

    const centerY = H / 2;
    const contentX = BAR_W + PAD_X;
    const iconX = contentX;
    const textX = contentX + (icon ? ICON_SIZE + GAP : 0);

    const iconEl = icon
      ? `<image x="${iconX}" y="${centerY - ICON_SIZE / 2}" width="${ICON_SIZE}" height="${ICON_SIZE}" href="${icon}" preserveAspectRatio="xMidYMid meet" class="fade-in" style="animation-delay: 0.05s" />`
      : "";

    return svgRoot(
      W,
      H,
      `
      ${svgAnimationStyles(theme)}
      ${dynamicBarDefs()}
      <defs>
        <linearGradient id="btn-bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${surface.top}" />
          <stop offset="100%" stop-color="${surface.bottom}" />
        </linearGradient>
        <clipPath id="btn-clip">
          <rect width="${W}" height="${H}" rx="${RADIUS}" ry="${RADIUS}" />
        </clipPath>
      </defs>

      <g clip-path="url(#btn-clip)">
        <!-- 背景 -->
        <rect width="${W}" height="${H}" fill="url(#btn-bg)" />

        <!-- 動的左バー（流動レインボー） -->
        ${dynamicLeftBar(H)}

        ${iconEl}

        <text x="${textX}" y="${centerY + 5}" font-size="${FONT_SIZE}" font-weight="600"
          fill="${theme.text}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"
          letter-spacing="0.2" class="fade-in-up" style="animation-delay: 0.15s">${labelEsc}</text>
      </g>

      <!-- ボーダー（クリップ外に出して stroke が半分欠けないようにする） -->
      <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${RADIUS}" ry="${RADIUS}"
        fill="none" stroke="${theme.border}" stroke-width="1" />
    `,
    );
  },
};
