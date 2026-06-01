import { PageHeader } from '@/components/dashboard/page-header';
import { requireAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { TemplateEditor } from './template-editor';

export default async function TemplatesPage() {
  await requireAuth();
  const supabase = createClient();
  const { data: templates } = await supabase
    .from('notification_templates')
    .select('*')
    .order('trigger_type', { ascending: true });

  return (
    <>
      <PageHeader
        title="通知テンプレ"
        description="LINE 通知メッセージのテンプレート（変数は配信時に置換されます）"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {templates?.map((t) => (
          <TemplateEditor key={t.id} template={t} />
        ))}
      </div>
    </>
  );
}
