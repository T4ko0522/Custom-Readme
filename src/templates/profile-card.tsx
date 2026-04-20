import { getTheme } from "@/lib/colors";
import {
  svgRoot,
  svgAnimationStyles,
  escSvg,
  dynamicBarDefs,
  dynamicLeftBar,
  STATIC_BAR_GRADIENT,
} from "@/lib/svg";
import { HI_GIF_DATA_URI } from "@/lib/assets";
import type { TemplateDefinition } from "./types";

const parseList = (s: string | undefined) =>
  (s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const parseLines = (s: string | undefined) =>
  (s ?? "")
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);

// ============================================================
// skillicons.dev フェッチヘルパー
// ============================================================

type IconBlock = {
  /** 生の SVG テキスト（SVG レンダーでは入れ子の <svg> としてそのままインライン） */
  svg: string;
  /** Satori の <img src> 用データURI */
  dataUri: string;
  width: number;
  height: number;
};

/** 900px 幅カードの content 領域（781px）に収まる最大アイコン数。
 *  48px アイコン + 12px gap で計算：13個 × 48 + 12 × 12 = 768px */
const MAX_ICONS_PER_LINE = 13;

async function fetchSkillIcons(csvList: string): Promise<IconBlock | null> {
  const idsList = csvList
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (idsList.length === 0) return null;
  const ids = idsList.join(",");
  // perline を行内アイコン数に合わせる（ユーザーの意図した「1行分」をそのまま1行で返す）。
  // ただし content 領域を超えないよう MAX で抑える。
  const perline = Math.min(idsList.length, MAX_ICONS_PER_LINE);

  try {
    const res = await fetch(
      `https://skillicons.dev/icons?i=${encodeURIComponent(ids)}&perline=${perline}`,
    );
    if (!res.ok) return null;
    const svg = await res.text();
    const wMatch = svg.match(/<svg[^>]*\bwidth="(\d+(?:\.\d+)?)"/);
    const hMatch = svg.match(/<svg[^>]*\bheight="(\d+(?:\.\d+)?)"/);
    if (!wMatch || !hMatch) return null;
    return {
      svg,
      dataUri: `data:image/svg+xml,${encodeURIComponent(svg)}`,
      width: Math.round(parseFloat(wMatch[1])),
      height: Math.round(parseFloat(hMatch[1])),
    };
  } catch {
    return null;
  }
}

/** `|` で分割した行ごとに skillicons を取得。順序を維持したまま null を除去。 */
async function fetchSkillsLines(raw: string): Promise<IconBlock[]> {
  const lines = raw
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const results = await Promise.all(lines.map((line) => fetchSkillIcons(line)));
  return results.filter((b): b is IconBlock => b !== null);
}

// ============================================================
// テンプレート
// ============================================================

export const profileCard: TemplateDefinition = {
  name: "profile-card",
  description:
    "プロフィール全体を1枚で表現する総合カード。挨拶・Bio・技術スタック・引用・リンクを動的アニメーションで表示。",
  width: 900,
  height: 720,
  fonts: ["default"],
  params: {
    name: {
      type: "string",
      required: true,
      description: "表示名（例: T4ko0522）",
    },
    greeting: {
      type: "string",
      default: "Hi there!",
      description: "挨拶文（改行で複数行）",
      multiline: true,
    },
    bio: {
      type: "string",
      default: "",
      description: "自己紹介（改行で複数行）",
      multiline: true,
    },
    skills: {
      type: "string",
      default: "",
      description:
        "スキルアイコン（skillicons.dev の ID をカンマ区切り。改行で別行のアイコン列に）",
      multiline: true,
    },
    quote: {
      type: "string",
      default: "",
      description: "引用・好きな言葉（改行で複数行）",
      multiline: true,
    },
    theme: {
      type: "string",
      default: "dark",
      description: "カラーテーマ",
      enum: ["dark", "light", "github"],
    },
  },

  // ============================================================
  // データ取得：skillicons.dev の SVG を行ごとに並列フェッチ
  // ============================================================
  fetchData: async (props) => {
    const skillsLines = await fetchSkillsLines((props.skills as string) ?? "");
    return { skillsLines };
  },

  // ============================================================
  // PNG (Satori JSX) レンダー
  // ============================================================
  render: (props) => {
    const theme = getTheme(props.theme as string);
    const name = props.name as string;
    const greetingLines = parseLines((props.greeting as string) || "Hi there!");
    const bioLines = parseLines(props.bio as string);
    const quoteLines = parseLines(props.quote as string);

    const skillsLines = (props.skillsLines as IconBlock[] | undefined) ?? [];

    return (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: theme.bg,
          fontFamily: "Inter, Noto Sans JP",
          position: "relative",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        {/* 左バー（PNGでは静的） */}
        <div
          style={{
            display: "flex",
            width: "7px",
            background: STATIC_BAR_GRADIENT,
          }}
        />

        {/* メインコンテンツ */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "48px 56px",
            gap: "20px",
          }}
        >
          {/* 挨拶（GIF + テキスト、複数行対応） */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HI_GIF_DATA_URI}
              alt="Hi"
              width={36}
              height={36}
              style={{ display: "flex" }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {greetingLines.map((line, i) => (
                <span key={i} style={{ fontSize: "22px", color: theme.subtext }}>
                  {line}
                </span>
              ))}
            </div>
          </div>

          {/* 名前 */}
          <span
            style={{
              fontSize: "56px",
              fontWeight: 700,
              color: theme.text,
              lineHeight: 1.1,
              letterSpacing: "-1.5px",
              marginTop: "-8px",
            }}
          >
            I&apos;m {name}
          </span>

          {/* Bio */}
          {bioLines.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                marginTop: "4px",
              }}
            >
              {bioLines.map((line, i) => (
                <span
                  key={i}
                  style={{ fontSize: "18px", color: theme.subtext, lineHeight: 1.5 }}
                >
                  {line}
                </span>
              ))}
            </div>
          )}

          {/* 区切り */}
          {skillsLines.length > 0 && (
            <div
              style={{
                display: "flex",
                height: "1px",
                background: theme.border,
                marginTop: "12px",
                marginBottom: "4px",
              }}
            />
          )}

          {/* Skills */}
          {skillsLines.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: "3px",
                    height: "12px",
                    borderRadius: "2px",
                    background: STATIC_BAR_GRADIENT,
                  }}
                />
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: theme.subtext,
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                  }}
                >
                  Skills
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {skillsLines.map((block, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={block.dataUri}
                    alt={`Skills row ${i + 1}`}
                    width={block.width}
                    height={block.height}
                    style={{ display: "flex" }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 引用（複数行対応、前後に " を付与） */}
          {quoteLines.length > 0 && (
            <>
              <div
                style={{
                  display: "flex",
                  height: "1px",
                  background: theme.border,
                  marginTop: "8px",
                }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                {quoteLines.map((line, i) => {
                  const prefix = i === 0 ? "“" : "";
                  const suffix = i === quoteLines.length - 1 ? "”" : "";
                  return (
                    <span
                      key={i}
                      style={{
                        fontSize: "15px",
                        color: theme.accent,
                        fontStyle: "italic",
                        lineHeight: 1.5,
                      }}
                    >
                      {prefix}
                      {line}
                      {suffix}
                    </span>
                  );
                })}
              </div>
            </>
          )}

        </div>
      </div>
    );
  },

  // ============================================================
  // SVG アニメーションレンダー
  // ============================================================
  renderSvg: (props) => {
    const theme = getTheme(props.theme as string);
    const name = escSvg(props.name as string);
    const greetingLines = parseLines((props.greeting as string) || "Hi there!");
    const bioLines = parseLines(props.bio as string);
    const quoteLines = parseLines(props.quote as string);

    const skillsLines = (props.skillsLines as IconBlock[] | undefined) ?? [];

    const W = 900;
    const padX = 56;
    const contentX = 7 + padX;
    const maxW = W - contentX - padX;

    // ========== レイアウト計算 ==========
    let y = 80;
    const parts: string[] = [];

    // 挨拶: Hi.gif の右隣にテキスト（複数行対応）
    const gifSize = 25;
    const gifGap = 4;
    const greetingLineGap = 28;
    // 複数行の場合は全体ブロックの視覚中心に GIF を合わせる
    const greetingBlockH =
      greetingLines.length * 22 + (greetingLines.length - 1) * 6;
    const greetingTopY = y - 16; // 1行目 cap top の推定
    const greetingCenterY = greetingTopY + greetingBlockH / 2;
    const gifY = greetingCenterY - gifSize / 2;
    parts.push(
      `<image x="${contentX}" y="${gifY}" width="${gifSize}" height="${gifSize}" href="${HI_GIF_DATA_URI}" preserveAspectRatio="xMidYMid meet" class="fade-in" style="animation-delay: 0.1s" />`,
    );
    greetingLines.forEach((line, i) => {
      const delay = (0.2 + i * 0.08).toFixed(2);
      parts.push(
        `<text x="${contentX + gifSize + gifGap}" y="${y + i * greetingLineGap}" font-size="22" fill="${theme.subtext}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" class="fade-in-up" style="animation-delay: ${delay}s">${escSvg(line)}</text>`,
      );
    });
    // 末尾行のベースライン + 余白 → 名前の cap top
    y += (greetingLines.length - 1) * greetingLineGap + 58;

    // 名前
    parts.push(
      `<text x="${contentX}" y="${y}" font-size="56" font-weight="700" fill="${theme.text}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" letter-spacing="-1.5" class="fade-in-up" style="animation-delay: 0.3s">I'm ${name}</text>`,
    );
    y += 40;

    // Bio
    if (bioLines.length > 0) {
      y += 24;
      bioLines.forEach((line, i) => {
        const delay = (0.5 + i * 0.12).toFixed(2);
        parts.push(
          `<text x="${contentX}" y="${y}" font-size="18" fill="${theme.subtext}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" class="fade-in-up" style="animation-delay: ${delay}s">${escSvg(line)}</text>`,
        );
        y += 28;
      });
    }

    // 区切り（Skills あれば）
    if (skillsLines.length > 0) {
      y += 20;
      parts.push(
        `<line x1="${contentX}" y1="${y}" x2="${W - padX}" y2="${y}" stroke="url(#divider-h)" stroke-width="1" stroke-dasharray="${maxW}" stroke-dashoffset="${maxW}" style="animation: drawLine 1s ease-out 0.8s both" />`,
      );
      y += 24;
    }

    // Skills（行ごとに skillicons.dev の SVG を入れ子でインライン）
    let stackDelay = 1.0;
    if (skillsLines.length > 0) {
      // セクションラベル前のアクセントバー（レインボーグラデ）
      parts.push(
        `<rect x="${contentX}" y="${y - 10}" width="3" height="11" rx="1.5" fill="url(#flow-bar-v)" class="fade-in" style="animation-delay: ${stackDelay.toFixed(2)}s" />`,
      );
      parts.push(
        `<text x="${contentX + 12}" y="${y}" font-size="11" font-weight="700" fill="${theme.subtext}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" letter-spacing="2" class="fade-in" style="animation-delay: ${stackDelay.toFixed(2)}s">SKILLS</text>`,
      );
      y += 18;
      skillsLines.forEach((block, i) => {
        const delay = (stackDelay + 0.1 + i * 0.12).toFixed(2);
        parts.push(
          `<g transform="translate(${contentX}, ${y})" class="fade-in" style="animation-delay: ${delay}s">${block.svg}</g>`,
        );
        y += block.height + 10;
      });
      y += 12;
      stackDelay += 0.3;
    }

    // 引用（複数行対応、先頭/末尾行にのみ “ ” を付与）
    if (quoteLines.length > 0) {
      y += 8;
      parts.push(
        `<line x1="${contentX}" y1="${y}" x2="${W - padX}" y2="${y}" stroke="url(#divider-h)" stroke-width="1" stroke-dasharray="${maxW}" stroke-dashoffset="${maxW}" style="animation: drawLine 1s ease-out ${stackDelay.toFixed(2)}s both" />`,
      );
      y += 32;
      quoteLines.forEach((line, i) => {
        const prefix = i === 0 ? "“" : "";
        const suffix = i === quoteLines.length - 1 ? "”" : "";
        const delay = (stackDelay + 0.2 + i * 0.08).toFixed(2);
        parts.push(
          `<text x="${contentX}" y="${y}" font-size="15" font-style="italic" fill="${theme.accent}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" class="fade-in-up" style="animation-delay: ${delay}s">${prefix}${escSvg(line)}${suffix}</text>`,
        );
        y += 22;
      });
      y += 8;
    }

    const H = Math.max(y + 40, 400);

    // テンプレート固有の装飾 defs
    const RADIUS = 12;
    const extraDefs = `
      <defs>
        <!-- ドットグリッド（サブテクスト色をごく薄く） -->
        <pattern id="dot-grid" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="${theme.subtext}" opacity="0.09" />
        </pattern>
        <!-- ラウンドコーナー用クリップ -->
        <clipPath id="card-clip">
          <rect width="${W}" height="${H}" rx="${RADIUS}" ry="${RADIUS}" />
        </clipPath>
      </defs>
    `;

    // 4隅のコーナーマーカー（バー側は干渉するので右側のみ）
    const corners = `
      <path d="M ${W - 44} 24 L ${W - 24} 24 L ${W - 24} 44"
        stroke="#f97316" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.45"
        style="animation: fadeIn 0.8s ease-out 0.1s both" />
      <path d="M ${W - 24} ${H - 44} L ${W - 24} ${H - 24} L ${W - 44} ${H - 24}"
        stroke="#f472b6" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.4"
        style="animation: fadeIn 0.8s ease-out 0.2s both" />
    `;

    return svgRoot(
      W,
      H,
      `
      ${svgAnimationStyles(theme)}
      ${dynamicBarDefs()}
      ${extraDefs}

      <g clip-path="url(#card-clip)">
        <!-- 背景 -->
        <rect width="${W}" height="${H}" fill="${theme.bg}" />

        <!-- ドットグリッド（コンテンツ領域のみ） -->
        <rect x="7" y="0" width="${W - 7}" height="${H}" fill="url(#dot-grid)" />

        <!-- 動的左バー（流動レインボー + 光の筋） -->
        ${dynamicLeftBar(H)}

        <!-- コーナーマーカー -->
        ${corners}

        <!-- コンテンツ -->
        ${parts.join("\n")}
      </g>
    `,
    );
  },
};
