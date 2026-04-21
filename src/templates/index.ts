import type { TemplateDefinition } from "./types";
import { profileCard } from "./profile-card";
import { profileViews } from "./profile-views";
import { githubStats } from "./github-stats";
import { topLanguages } from "./top-languages";
import { button } from "./button";

export const templates: Record<string, TemplateDefinition> = {
  "profile-card": profileCard,
  "profile-views": profileViews,
  "github-stats": githubStats,
  "top-languages": topLanguages,
  button,
};
