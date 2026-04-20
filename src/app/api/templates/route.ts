import { templates } from "@/templates";
import { getTemplateMetas } from "@/templates/meta";

export async function GET() {
  return Response.json(getTemplateMetas(templates));
}
