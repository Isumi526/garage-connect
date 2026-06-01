'use client';

import { type TemplateState, updateTemplate } from '@/app/dashboard/templates/actions';
import { SubmitButton } from '@/components/auth/submit-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TEMPLATE_VARIABLES } from '@/lib/line/messages';
import type { Database } from '@/types/database.types';
import { useFormState } from 'react-dom';

type Template = Database['public']['Tables']['notification_templates']['Row'];

const TRIGGER_LABEL: Record<string, string> = {
  inspection_expiry: '車検満了',
  inspection_12month: '12ヶ月点検',
  liability_insurance_expiry: '自賠責保険満了',
};

export function TemplateEditor({ template }: { template: Template }) {
  const action = updateTemplate.bind(null, template.id);
  const [state, formAction] = useFormState<TemplateState, FormData>(action, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{TRIGGER_LABEL[template.trigger_type] ?? template.trigger_type}</span>
          <span className="text-xs font-normal text-muted-foreground">{template.channel}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`title-${template.id}`}>タイトル</Label>
            <Input id={`title-${template.id}`} name="title" defaultValue={template.title ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`body-${template.id}`}>本文</Label>
            <Textarea
              id={`body-${template.id}`}
              name="body"
              rows={5}
              defaultValue={template.body}
              required
            />
            <p className="text-xs text-muted-foreground">
              使用可能な変数:{' '}
              {TEMPLATE_VARIABLES.map((v) => (
                <code key={v.key} className="mr-1 rounded bg-muted px-1">
                  {`{{${v.key}}}`}
                </code>
              ))}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={template.is_active}
              className="h-4 w-4"
            />
            この通知を有効にする
          </label>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state?.success && <p className="text-sm text-primary">{state.success}</p>}
          <div className="w-32">
            <SubmitButton>保存</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
