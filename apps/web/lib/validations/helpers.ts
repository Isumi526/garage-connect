import { z } from 'zod';

/** 空文字を undefined に正規化した上で任意文字列として扱う */
export const optionalString = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().trim().optional(),
);

/** 空文字を undefined にして任意の整数として扱う */
export const optionalInt = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : v),
  z.coerce.number().int().optional(),
);

/** 空文字を undefined にして YYYY-MM-DD の日付文字列として扱う */
export const optionalDate = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付は YYYY-MM-DD 形式で入力してください')
    .optional(),
);

/** FormData をプレーンオブジェクトへ変換（同名複数キーは配列化しない単純版） */
export function formToObject(formData: FormData): Record<string, FormDataEntryValue> {
  const obj: Record<string, FormDataEntryValue> = {};
  for (const [key, value] of formData.entries()) {
    obj[key] = value;
  }
  return obj;
}

/** undefined のキーを除いたオブジェクトを返す（DB の null 上書き回避や型整合に使用） */
export function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k as keyof T] = v as T[keyof T];
  }
  return out;
}
