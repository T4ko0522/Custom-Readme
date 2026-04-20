import { ImageResponse } from "next/og";
import { templates } from "@/templates";
import { parseParams, ParamError } from "@/lib/params";
import { loadFonts } from "@/lib/fonts";
import { GitHubError } from "@/lib/github";
import { getTheme } from "@/lib/colors";
import { svgRoot, escSvg } from "@/lib/svg";

export const runtime = "edge";

const CACHE_HEADERS = {
  "Cache-Control":
    "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
};

/** エラー時に返すSVG画像 */
function errorSvg(message: string, width = 500, height = 120): Response {
  const theme = getTheme("dark");
  const body = `
    <rect width="${width}" height="${height}" fill="${theme.bg}" />
    <rect x="0" y="0" width="4" height="${height}" fill="#f85149" />
    <text x="24" y="50" font-size="16" font-weight="700" fill="#f85149" font-family="system-ui, sans-serif">Error</text>
    <text x="24" y="80" font-size="14" fill="${theme.subtext}" font-family="system-ui, sans-serif">${escSvg(message)}</text>
  `;
  return new Response(svgRoot(width, height, body), {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ template: string }> },
) {
  const { template: templateName } = await params;
  const definition = templates[templateName];

  if (!definition) {
    return Response.json(
      { error: `テンプレート "${templateName}" が見つかりません` },
      { status: 404 },
    );
  }

  const { searchParams } = new URL(request.url);

  let props: Record<string, unknown>;
  try {
    props = parseParams(searchParams, definition.params);
  } catch (e) {
    if (e instanceof ParamError) {
      return Response.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }

  // テンプレートが public/ 配下のアセットを runtime fetch できるようオリジンを注入
  props.__origin = new URL(request.url).origin;

  // GitHubなど外部データ取得
  if (definition.fetchData) {
    try {
      const fetched = await definition.fetchData(props);
      props = { ...props, ...fetched };
    } catch (e) {
      const message =
        e instanceof GitHubError
          ? e.message
          : e instanceof Error
            ? e.message
            : "データ取得に失敗しました";
      return errorSvg(message, definition.width, definition.height);
    }
  }

  const format = searchParams.get("format") || "png";

  // SVG形式（アニメーション付き）
  if (format === "svg" && definition.renderSvg) {
    return new Response(definition.renderSvg(props), {
      headers: {
        "Content-Type": "image/svg+xml",
        ...CACHE_HEADERS,
      },
    });
  }

  // PNG形式（デフォルト）
  const width = Number(searchParams.get("width")) || definition.width;
  const height = Number(searchParams.get("height")) || definition.height;

  const fontSets = definition.fonts ?? ["default"];
  if (searchParams.get("fontLang") === "ja" && !fontSets.includes("ja")) {
    fontSets.push("ja");
  }
  const fonts = await loadFonts(fontSets);

  return new ImageResponse(definition.render(props), {
    width,
    height,
    fonts,
    headers: CACHE_HEADERS,
  });
}
