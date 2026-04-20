import { getTheme } from "@/lib/colors";
import { fetchUserStats, formatNumber, type UserStats } from "@/lib/github";
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

function statsFromProps(props: Record<string, unknown>): UserStats {
  return props.__stats as UserStats;
}

function statItems(stats: UserStats) {
  return [
    { label: "Total Stars", value: formatNumber(stats.totalStars) },
    { label: "Repositories", value: formatNumber(stats.totalRepos) },
    { label: "Followers", value: formatNumber(stats.followers) },
    {
      label: "YTD Commits",
      value: stats.totalCommits > 0 ? formatNumber(stats.totalCommits) : "—",
    },
  ];
}

export const githubStats: TemplateDefinition = {
  name: "github-stats",
  description:
    "GitHubプロフィール統計。スター合計、リポジトリ数、フォロワー、年間コミットを表示。",
  width: 440,
  height: 200,
  params: {
    username: {
      type: "string",
      required: true,
      description: "GitHubユーザー名",
    },
    theme: {
      type: "string",
      default: "dark",
      description: "カラーテーマ",
      enum: ["dark", "light", "github"],
    },
    title: {
      type: "string",
      default: "",
      description: "タイトル（空なら「{name}'s GitHub Stats」）",
    },
  },

  fetchData: async (props) => {
    const stats = await fetchUserStats(props.username as string);
    return { __stats: stats };
  },

  render: (props) => {
    const theme = getTheme(props.theme as string);
    const stats = statsFromProps(props);
    const items = statItems(stats);
    const title =
      (props.title as string) ||
      `${stats.name || stats.login}'s GitHub Stats`;

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

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            padding: "28px 28px",
          }}
        >
          {/* アクセントバー + タイトル */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                width: "3px",
                height: "20px",
                borderRadius: "2px",
                background: STATIC_BAR_GRADIENT,
              }}
            />
            <span
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: theme.text,
              }}
            >
              {title}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "space-between",
            }}
          >
            {items.map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  flex: 1,
                }}
              >
                <span
                  style={{
                    fontSize: "30px",
                    fontWeight: 700,
                    color: theme.text,
                    lineHeight: 1.1,
                  }}
                >
                  {item.value}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    color: theme.subtext,
                    textTransform: "uppercase",
                    letterSpacing: "1.2px",
                    marginTop: "4px",
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  },

  renderSvg: (props) => {
    const theme = getTheme(props.theme as string);
    const stats = statsFromProps(props);
    const items = statItems(stats);
    const title = escSvg(
      (props.title as string) || `${stats.name || stats.login}'s GitHub Stats`,
    );

    const W = 440;
    const H = 200;
    const barW = 7;
    const padL = barW + 28;
    const padR = 24;
    const contentX = padL;
    const labelOffsetX = 12;
    const colW = (W - padL - padR) / items.length;

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

        <!-- タイトル前のアクセントバー -->
        <rect x="${contentX}" y="38" width="3" height="20" rx="1.5" fill="url(#flow-bar-v)"
          class="fade-in" style="animation-delay: 0.15s" />

        <!-- タイトル -->
        <text x="${contentX + labelOffsetX}" y="56" font-size="18" font-weight="700" fill="${theme.text}" font-family="system-ui, -apple-system, sans-serif"
          class="fade-in-up" style="animation-delay: 0.2s">${title}</text>

        <!-- 区切り線 -->
        <line x1="${contentX}" y1="76" x2="${contentX + 80}" y2="76" stroke="url(#divider-h)" stroke-width="2"
          stroke-dasharray="80" stroke-dashoffset="80"
          style="animation: drawLine 0.6s ease-out 0.4s both" />

        <!-- 統計値 -->
        ${items
          .map((item, i) => {
            const x = contentX + colW * i;
            const delay = (0.5 + i * 0.12).toFixed(2);
            return `
        <g class="fade-in-up" style="animation-delay: ${delay}s">
          <text x="${x}" y="142" font-size="30" font-weight="700" fill="${theme.text}" font-family="system-ui, -apple-system, sans-serif">${escSvg(item.value)}</text>
          <text x="${x}" y="165" font-size="10" font-weight="600" fill="${theme.subtext}" font-family="system-ui, -apple-system, sans-serif" letter-spacing="1.2">${escSvg(item.label.toUpperCase())}</text>
        </g>`;
          })
          .join("\n      ")}
      </g>
    `,
    );
  },
};
