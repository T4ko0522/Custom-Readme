type FontSet = "default" | "ja";

type FontData = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal";
};

const cache = new Map<string, ArrayBuffer>();

async function fetchFont(
  family: string,
  weight: number,
  text?: string,
): Promise<ArrayBuffer> {
  const key = `${family}-${weight}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const params = new URLSearchParams({
    family: `${family}:wght@${weight}`,
  });
  if (text) params.set("text", text);

  const cssRes = await fetch(
    `https://fonts.googleapis.com/css2?${params.toString()}`,
    {
      headers: {
        // TTF/OTF形式を取得するためのUser-Agent（WOFF2はSatori非対応）
        "User-Agent":
          "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1",
      },
    },
  );
  const css = await cssRes.text();

  const match = css.match(
    /src: url\((.+?)\) format\('(opentype|truetype)'\)/,
  );
  if (!match?.[1]) {
    throw new Error(`フォントが見つかりません: ${family}`);
  }

  const data = await (await fetch(match[1])).arrayBuffer();
  cache.set(key, data);
  return data;
}

export async function loadFonts(sets: FontSet[]): Promise<FontData[]> {
  const fonts: FontData[] = [];

  if (sets.includes("default")) {
    const [regular, bold] = await Promise.all([
      fetchFont("Inter", 400),
      fetchFont("Inter", 700),
    ]);
    fonts.push(
      { name: "Inter", data: regular, weight: 400, style: "normal" },
      { name: "Inter", data: bold, weight: 700, style: "normal" },
    );
  }

  if (sets.includes("ja")) {
    const [regular, bold] = await Promise.all([
      fetchFont("Noto+Sans+JP", 400),
      fetchFont("Noto+Sans+JP", 700),
    ]);
    fonts.push(
      { name: "Noto Sans JP", data: regular, weight: 400, style: "normal" },
      { name: "Noto Sans JP", data: bold, weight: 700, style: "normal" },
    );
  }

  return fonts;
}
