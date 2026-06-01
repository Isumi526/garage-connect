import { z } from 'zod';
import { optionalDate, optionalString } from './helpers';

export const customerSchema = z.object({
  customer_type: z.enum(['individual', 'corporate']).default('individual'),
  name: z.string().trim().min(1, '名前を入力してください').max(100),
  name_kana: optionalString,
  postal_code: optionalString,
  address: optionalString,
  phone: optionalString,
  email: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().email('メールアドレスの形式が正しくありません').optional(),
  ),
  birthday: optionalDate,
  corporate_name: optionalString,
  representative_name: optionalString,
  notes: optionalString,
  status: z.enum(['active', 'inactive']).default('active'),
});

export type CustomerInput = z.infer<typeof customerSchema>;
