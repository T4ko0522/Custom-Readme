import type { ParamDef } from "./types";

export type TemplateMeta = {
  name: string;
  description: string;
  width: number;
  height: number;
  params: Record<string, ParamDef>;
};

export function getTemplateMetas(
  templates: Record<string, { name: string; description: string; width: number; height: number; params: Record<string, ParamDef> }>,
): TemplateMeta[] {
  return Object.values(templates).map(({ name, description, width, height, params }) => ({
    name,
    description,
    width,
    height,
    params,
  }));
}
