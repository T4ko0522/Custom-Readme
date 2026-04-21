import { ImageResponse } from "next/og";
import { templates } from "@/templates";
import { parseParams, ParamError } from "@/lib/params";
import { loadFonts } from "@/lib/fonts";
import { GitHubError } from "@/lib/github";
import { getTheme } from "@/lib/colors";
import { svgRoot, escSvg } from "@/lib/svg";

export const runtime = "edge";

// デプロイごとに変わる ID。ETag に埋め込むことで、max-age が生きていても
// デプロイを跨いだ古いレスポンスは必ず 200 で差し替わる（同一デプロイ中は 304）。
// ローカル開発では "dev" にフォールバックする。
const DEPLOY_ID =
  process.env.VERCEL_DEPLOYMENT_ID ||
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ||
  "dev";
const ETAG = `W/"${DEPLOY_ID}"`;

const CACHE_HEADERS = {
  // max-age=0 + must-revalidate: ブラウザは毎回 If-None-Match で問い合わせる。
  //   ETag が一致すれば 304、デプロイが変われば 200 で新しい画像を受け取る。
  // s-maxage=3600: Vercel Edge は 1 時間キャッシュ（デプロイ時に自動 purge）。
  // stale-while-revalidate: フレッシュ取得中は旧版を返し続ける。
  "Cache-Control":
    "public, max-age=0, must-revalidate, s-maxage=3600, stale-while-revalidate=86400",
  ETag: ETAG,
};

// 画像配信そのものが副作用を持つテンプレート用。GitHub Camo / CDN / ブラウザ
// すべてを素通りさせ、毎リクエスト origin まで届かせる。
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0, private",
  Pragma: "no-cache",
  Expires: "0",
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

  // デプロイが同じなら 304 で早期終了（fetchData / Satori / SVG を全てスキップ）。
  // noCache テンプレート（訪問者カウンタ等）は毎回 origin まで届かせたいのでスキップ。
  if (!definition.noCache) {
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === ETAG) {
      return new Response(null, {
        status: 304,
        headers: {
          "Cache-Control": CACHE_HEADERS["Cache-Control"],
          ETag: ETAG,
        },
      });
    }
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
  const cacheHeaders = definition.noCache ? NO_STORE_HEADERS : CACHE_HEADERS;

  // SVG形式（アニメーション付き）
  if (format === "svg" && definition.renderSvg) {
    return new Response(definition.renderSvg(props), {
      headers: {
        "Content-Type": "image/svg+xml",
        ...cacheHeaders,
      },
    });
  }

  // PNG形式（デフォルト）
  // テンプレートの fetchData が props.__width / __height を返した場合は
  // 定義値の代わりに採用する（label 長などからの動的サイズ算出用）
  const dynamicW =
    typeof props.__width === "number" ? (props.__width as number) : null;
  const dynamicH =
    typeof props.__height === "number" ? (props.__height as number) : null;
  const width =
    Number(searchParams.get("width")) || dynamicW || definition.width;
  const height =
    Number(searchParams.get("height")) || dynamicH || definition.height;

  const fontSets = definition.fonts ?? ["default"];
  if (searchParams.get("fontLang") === "ja" && !fontSets.includes("ja")) {
    fontSets.push("ja");
  }
  const fonts = await loadFonts(fontSets);

  return new ImageResponse(definition.render(props), {
    width,
    height,
    fonts,
    headers: cacheHeaders,
  });
}
