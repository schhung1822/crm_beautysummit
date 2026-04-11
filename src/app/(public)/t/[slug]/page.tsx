import TemplateRenderer from "@/components/form-template/TemplateRenderer";
import { ensureDefaultTemplate, getTemplateBySlug } from "@/lib/form-template/repo";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await ensureDefaultTemplate(slug);

  const tpl = await getTemplateBySlug(slug);
  if (!tpl) {
    return <div className="p-6">Template không tồn tại hoặc đã tắt.</div>;
  }

  return <TemplateRenderer config={tpl.config} />;
}
