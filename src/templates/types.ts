import type { ReactElement } from "react";

export type ParamDef = {
  type: "string" | "number" | "boolean";
  default?: string | number | boolean;
  required?: boolean;
  description: string;
  enum?: readonly string[];
  /** プレビュー入力で textarea として扱い、改行を `|` にシリアライズする */
  multiline?: boolean;
};

export type TemplateDefinition = {
  name: string;
  description: string;
  width: number;
  height: number;
  params: Record<string, ParamDef>;
  fonts?: ("default" | "ja")[];
  /** レンダー前にGitHub APIなどからデータを取得。返却値は props にマージされる */
  fetchData?: (
    props: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  render: (props: Record<string, unknown>) => ReactElement;
  /** アニメーション付きSVG文字列を返す。format=svg 時に使用 */
  renderSvg?: (props: Record<string, unknown>) => string;
};
