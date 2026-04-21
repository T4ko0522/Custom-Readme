import { getTheme } from "@/lib/colors";
import {
  fetchUserStats,
  formatNumber,
  type UserStats,
  type RankLevel,
} from "@/lib/github";
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

// ============================================================
// GitHub Stats カード
// anuraghazra/github-readme-stats 互換のランクスコアを右端に表示する。
// 左側は octicons アイコン付きの縦並びリスト。
// ============================================================

const W = 440;
const H = 200;
const RADIUS = 12;
const BAR_W = 7;

// ランク円（右端）
const RANK_R = 55;
const RANK_STROKE = 4;
const RANK_RIGHT_PAD = 20;
const RANK_CX = W - RANK_RIGHT_PAD - RANK_R;
const RANK_CY = H / 2;

// 左側コンテンツ
const CONTENT_X = BAR_W + 28;
const STATS_ROW_H = 28;
const STATS_Y0 = 88; // 1行目の baseline
const ICON_SIZE = 16;
const ICON_GAP = 10;
const LABEL_WIDTH = 120; // 値の左端を揃えるためのラベル固定幅
const VALUE_GAP = 10;
const VALUE_X = CONTENT_X + ICON_SIZE + ICON_GAP + LABEL_WIDTH + VALUE_GAP;

// ============================================================
// Octicons（16x16 viewBox）。Primer のロゴをそのまま埋め込む。
// ============================================================
const ICONS: Record<"star" | "commit" | "pr" | "issue", string> = {
  star:
    "M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z",
  commit:
    "M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.75a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z",
  pr:
    "M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z",
  issue:
    "M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z",
};

const ICON_COLORS: Record<keyof typeof ICONS, string> = {
  star: "#fbbf24",
  commit: "#58a6ff",
  pr: "#a371f7",
  issue: "#3fb950",
};

type StatItem = {
  key: keyof typeof ICONS;
  label: string;
  value: string;
};

function statsFromProps(props: Record<string, unknown>): UserStats {
  return props.__stats as UserStats;
}

function statItems(stats: UserStats): StatItem[] {
  const fmtOrDash = (n: number) => (n > 0 ? formatNumber(n) : "—");
  return [
    { key: "star", label: "Total Stars", value: formatNumber(stats.totalStars) },
    { key: "commit", label: "Commits", value: fmtOrDash(stats.totalCommits) },
    { key: "pr", label: "Total PRs", value: fmtOrDash(stats.totalPRs) },
    { key: "issue", label: "Total Issues", value: fmtOrDash(stats.totalIssues) },
  ];
}

/** ランクレベル別のリング色 */
function rankColor(level: RankLevel): string {
  switch (level) {
    case "S":
      return "#fbbf24";
    case "A+":
    case "A":
    case "A-":
      return "#a855f7";
    case "B+":
    case "B":
    case "B-":
      return "#3b82f6";
    default:
      return "#f97316";
  }
}

export const githubStats: TemplateDefinition = {
  name: "github-stats",
  description:
    "GitHubプロフィール統計 + github-readme-stats 互換ランク。アイコン付き縦リストと右端のランク円。",
  width: W,
  height: H,
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
    include_all_commits: {
      type: "boolean",
      default: false,
      description:
        "ランク計算で全期間のコミット中央値（1000）を使う。false の場合は年間（250）",
    },
  },

  fetchData: async (props) => {
    const stats = await fetchUserStats(props.username as string, {
      includeAllCommits: Boolean(props.include_all_commits),
    });
    return { __stats: stats };
  },

  render: (props) => {
    const theme = getTheme(props.theme as string);
    const stats = statsFromProps(props);
    const items = statItems(stats);
    const title =
      (props.title as string) ||
      `${stats.name || stats.login}'s GitHub Stats`;
    const { level } = stats.rank;
    const ringColor = rankColor(level);

    return (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: theme.bg,
          fontFamily: "Inter, Noto Sans JP",
          position: "relative",
          borderRadius: `${RADIUS}px`,
          overflow: "hidden",
        }}
      >
        {/* 左バー */}
        <div
          style={{
            display: "flex",
            width: `${BAR_W}px`,
            background: STATIC_BAR_GRADIENT,
          }}
        />

        {/* 中央：タイトル + 縦リスト */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "24px 20px 24px 28px",
          }}
        >
          {/* タイトル */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "14px",
            }}
          >
            <div
              style={{
                display: "flex",
                width: "3px",
                height: "18px",
                borderRadius: "2px",
                background: STATIC_BAR_GRADIENT,
              }}
            />
            <span
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: theme.text,
              }}
            >
              {title}
            </span>
          </div>

          {/* 縦並び統計リスト */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            {items.map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: `${ICON_GAP}px`,
                  padding: "3px 0",
                }}
              >
                <svg
                  width={ICON_SIZE}
                  height={ICON_SIZE}
                  viewBox="0 0 16 16"
                  fill={ICON_COLORS[item.key]}
                  style={{ display: "flex", flexShrink: 0 }}
                >
                  <path d={ICONS[item.key]} />
                </svg>
                <span
                  style={{
                    display: "flex",
                    width: `${LABEL_WIDTH}px`,
                    fontSize: "14px",
                    color: theme.subtext,
                    fontWeight: 500,
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    display: "flex",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: theme.text,
                  }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 右端：ランク円（flex 子ではなく絶対配置でピン留め） */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "absolute",
            top: `${(H - RANK_R * 2) / 2}px`,
            right: `${RANK_RIGHT_PAD}px`,
            width: `${RANK_R * 2}px`,
            height: `${RANK_R * 2}px`,
            borderRadius: "999px",
            border: `${RANK_STROKE}px solid ${ringColor}`,
            backgroundColor: theme.bg,
          }}
        >
          <span
            style={{
              fontSize: "44px",
              fontWeight: 700,
              color: theme.text,
              lineHeight: 1,
            }}
          >
            {level}
          </span>
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
    const { level, percentile } = stats.rank;
    const ringColor = rankColor(level);

    const titleAccentX = CONTENT_X;
    const titleTextX = CONTENT_X + 12;
    const titleY = 44;
    const dividerY = 60;

    const circumference = 2 * Math.PI * RANK_R;
    const dashOffset = (circumference * percentile) / 100;

    // 各 stat 行：icon + label + value（いずれも左寄せ、value 列は固定 x）
    const statsRows = items
      .map((item, i) => {
        const y = STATS_Y0 + i * STATS_ROW_H;
        const delay = (0.45 + i * 0.1).toFixed(2);
        const iconColor = ICON_COLORS[item.key];
        return `
        <g class="fade-in-up" style="animation-delay: ${delay}s">
          <!-- アイコンを 16x16 で (CONTENT_X, y-12) に描画 -->
          <g transform="translate(${CONTENT_X}, ${y - 12})">
            <path d="${ICONS[item.key]}" fill="${iconColor}" />
          </g>
          <text x="${CONTENT_X + ICON_SIZE + ICON_GAP}" y="${y}" font-size="14" font-weight="500"
            fill="${theme.subtext}" font-family="system-ui, -apple-system, sans-serif">${escSvg(item.label)}</text>
          <text x="${VALUE_X}" y="${y}" font-size="14" font-weight="700"
            fill="${theme.text}" font-family="system-ui, -apple-system, sans-serif">${escSvg(item.value)}</text>
        </g>`;
      })
      .join("\n      ");

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
        <rect x="${titleAccentX}" y="${titleY - 16}" width="3" height="18" rx="1.5" fill="url(#flow-bar-v)"
          class="fade-in" style="animation-delay: 0.1s" />

        <!-- タイトル -->
        <text x="${titleTextX}" y="${titleY}" font-size="16" font-weight="700" fill="${theme.text}" font-family="system-ui, -apple-system, sans-serif"
          class="fade-in-up" style="animation-delay: 0.15s">${title}</text>

        <!-- 区切り線 -->
        <line x1="${CONTENT_X}" y1="${dividerY}" x2="${CONTENT_X + 90}" y2="${dividerY}" stroke="url(#divider-h)" stroke-width="2"
          stroke-dasharray="90" stroke-dashoffset="90"
          style="animation: drawLine 0.6s ease-out 0.35s both" />

        <!-- 縦リスト -->
        ${statsRows}

        <!-- ランク円：外側 g に translate 属性、内側 g に pop-in アニメーション。
             同一要素に transform 属性と CSS transform を併置すると CSS 側が属性を
             上書きして translate が失われるため、レイヤを分離する。 -->
        <g transform="translate(${RANK_CX}, ${RANK_CY})">
          <g class="pop-in" style="animation-delay: 0.85s">
            <circle r="${RANK_R}" fill="none" stroke="${theme.border}" stroke-width="${RANK_STROKE}" />
            <circle r="${RANK_R}" fill="none" stroke="${ringColor}" stroke-width="${RANK_STROKE}"
              stroke-linecap="round"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${circumference}"
              transform="rotate(-90)">
              <animate attributeName="stroke-dashoffset"
                from="${circumference}" to="${dashOffset}"
                dur="1.2s" begin="0.9s" fill="freeze" />
            </circle>
            <text text-anchor="middle" y="15" font-size="42" font-weight="700" fill="${theme.text}" font-family="system-ui, -apple-system, sans-serif">${escSvg(level)}</text>
          </g>
        </g>
      </g>
    `,
    );
  },
};
