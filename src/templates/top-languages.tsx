import { getTheme } from "@/lib/colors";
import { fetchTopLanguages, type LanguageStat } from "@/lib/github";
import {
  svgRoot,
  svgAnimationStyles,
  svgGradientDefs,
  escSvg,
  dynamicBarDefs,
  dynamicLeftBar,
  STATIC_BAR_GRADIENT,
} from "@/lib/svg";
import type { TemplateDefinition } from "./types";

function langsFromProps(props: Record<string, unknown>): LanguageStat[] {
  return (props.__langs as LanguageStat[]) ?? [];
}

export const topLanguages: TemplateDefinition = {
  name: "top-languages",
  description: "GitHubリポジトリで使われている言語トップN（バーチャート）",
  width: 440,
  height: 340,
  params: {
    username: {
      type: "string",
      required: true,
      description: "GitHubユーザー名",
    },
    limit: {
      type: "number",
      default: 6,
      description: "表示する言語数",
    },
    theme: {
      type: "string",
      default: "dark",
      description: "カラーテーマ",
      enum: ["dark", "light", "github"],
    },
  },

  fetchData: async (props) => {
    const langs = await fetchTopLanguages(
      props.username as string,
      (props.limit as number) || 6,
    );
    return { __langs: langs };
  },

  render: (props) => {
    const theme = getTheme(props.theme as string);
    const langs = langsFromProps(props);

    // Satori向けに絶対pxでバー幅を計算（width 100% が flex 内で暴れるのを防ぐ）
    const W = 440;
    const BAR_W = 7;
    const PAD_X = 32;
    const BAR_AREA_W = W - BAR_W - PAD_X * 2;

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
        {/* 左バー（PNGでは静的） */}
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
            flexDirection: "column",
            padding: `28px ${PAD_X}px`,
            gap: "18px",
          }}
        >
          {/* アクセントバー + ラベル */}
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
                height: "14px",
                borderRadius: "2px",
                background: STATIC_BAR_GRADIENT,
              }}
            />
            <span
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: theme.subtext,
                textTransform: "uppercase",
                letterSpacing: "2px",
              }}
            >
              Most Used Languages
            </span>
          </div>

          {langs.length === 0 ? (
            <span style={{ fontSize: "14px", color: theme.subtext }}>
              データがありません
            </span>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              {langs.map((lang) => (
                <div
                  key={lang.name}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    width: `${BAR_AREA_W}px`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "13px",
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          width: "10px",
                          height: "10px",
                          borderRadius: "5px",
                          backgroundColor: lang.color,
                        }}
                      />
                      <span style={{ color: theme.text, fontWeight: 600 }}>
                        {lang.name}
                      </span>
                    </div>
                    <span style={{ color: theme.subtext }}>
                      {lang.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      width: `${BAR_AREA_W}px`,
                      height: "6px",
                      backgroundColor: theme.border,
                      borderRadius: "3px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        width: `${Math.round((BAR_AREA_W * lang.percentage) / 100)}px`,
                        height: "100%",
                        backgroundColor: lang.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  },

  renderSvg: (props) => {
    const theme = getTheme(props.theme as string);
    const langs = langsFromProps(props);

    const W = 440;
    const barW = 7;
    const padL = barW + 32;
    const padR = 40;
    const rowH = 38;
    const headerH = 90;
    const H = headerH + langs.length * rowH + 20;
    const barAreaW = Math.max(0, W - padL - padR);

    const RADIUS = 12;

    return svgRoot(
      W,
      H,
      `
      ${svgAnimationStyles(theme)}
      ${svgGradientDefs(theme, "warm")}
      ${dynamicBarDefs()}

      <defs>
        <clipPath id="card-clip">
          <rect width="${W}" height="${H}" rx="${RADIUS}" ry="${RADIUS}" />
        </clipPath>
      </defs>

      <g clip-path="url(#card-clip)">
        <!-- 背景 -->
        <rect width="${W}" height="${H}" fill="${theme.bg}" />

        <!-- 動的左バー -->
        ${dynamicLeftBar(H)}

        <!-- ラベル前のアクセントバー -->
        <rect x="${padL}" y="38" width="3" height="14" rx="1.5" fill="url(#flow-bar-v)"
          class="fade-in" style="animation-delay: 0.05s" />

        <!-- ラベル -->
        <text x="${padL + 12}" y="50" font-size="14" font-weight="700" fill="${theme.subtext}" font-family="system-ui, -apple-system, sans-serif" letter-spacing="2"
          class="fade-in" style="animation-delay: 0.1s">MOST USED LANGUAGES</text>

        <line x1="${padL}" y1="62" x2="${padL + 160}" y2="62" stroke="url(#divider-h)" stroke-width="2"
          stroke-dasharray="160" stroke-dashoffset="160"
          style="animation: drawLine 0.8s ease-out 0.3s both" />

        ${
          langs.length === 0
            ? `<text x="${padL}" y="120" font-size="14" fill="${theme.subtext}" font-family="system-ui, -apple-system, sans-serif" class="fade-in" style="animation-delay: 0.4s">データがありません</text>`
            : langs
                .map((lang, i) => {
                  const y = headerH + i * rowH;
                  const delay = (0.4 + i * 0.1).toFixed(2);
                  const barFillW = (barAreaW * lang.percentage) / 100;
                  return `
        <g class="fade-in-up" style="animation-delay: ${delay}s">
          <!-- ドット -->
          <circle cx="${padL + 5}" cy="${y + 6}" r="5" fill="${lang.color}" />
          <!-- 言語名 -->
          <text x="${padL + 20}" y="${y + 10}" font-size="13" font-weight="600" fill="${theme.text}" font-family="system-ui, -apple-system, sans-serif">${escSvg(lang.name)}</text>
          <!-- パーセント -->
          <text x="${W - padR}" y="${y + 10}" text-anchor="end" font-size="13" fill="${theme.subtext}" font-family="system-ui, -apple-system, sans-serif">${lang.percentage.toFixed(1)}%</text>
          <!-- バー背景 -->
          <rect x="${padL}" y="${y + 20}" width="${barAreaW}" height="6" rx="3" fill="${theme.border}" />
          <!-- バー本体（幅アニメーション: 0から目標値へ） -->
          <rect x="${padL}" y="${y + 20}" width="0" height="6" rx="3" fill="${lang.color}">
            <animate attributeName="width" from="0" to="${barFillW}" dur="0.8s" begin="${delay}s" fill="freeze" />
          </rect>
        </g>`;
                })
                .join("\n      ")
        }
      </g>
    `,
    );
  },
};
