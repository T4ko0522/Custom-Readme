import type { ParamDef } from "@/templates/types";

export function parseParams(
  searchParams: URLSearchParams,
  schema: Record<string, ParamDef>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, def] of Object.entries(schema)) {
    const raw = searchParams.get(key);

    if (raw === null || raw === "") {
      if (def.required) {
        throw new ParamError(`必須パラメータ "${key}" が指定されていません`);
      }
      result[key] = def.default;
      continue;
    }

    if (def.enum && !def.enum.includes(raw)) {
      throw new ParamError(
        `"${key}" は ${def.enum.join(", ")} のいずれかを指定してください`,
      );
    }

    switch (def.type) {
      case "number": {
        const num = Number(raw);
        if (Number.isNaN(num)) {
          throw new ParamError(`"${key}" は数値を指定してください`);
        }
        result[key] = num;
        break;
      }
      case "boolean":
        result[key] = raw === "true" || raw === "1";
        break;
      default:
        result[key] = raw;
    }
  }

  return result;
}

export class ParamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParamError";
  }
}
