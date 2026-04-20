import type { TemplateDefinition } from "./types";
import { profileCard } from "./profile-card";
import { githubStats } from "./github-stats";
import { topLanguages } from "./top-languages";

export const templates: Record<string, TemplateDefinition> = {
  "profile-card": profileCard,
  "github-stats": githubStats,
  "top-languages": topLanguages,
};
