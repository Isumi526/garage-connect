import type { ParsedInspectionCertificate } from '@/lib/qr/inspection-certificate-parser';
/**
 * 車検証（自動車検査証）OCR — Gemini Vision
 * ============================================================
 * 車検証の画像(JPEG/PNG/WebP)や PDF を Gemini Vision に渡し、
 * 記載項目を構造化抽出して既存の `ParsedInspectionCertificate` 型で返す。
 * （QR パーサーと同じ出力型なので、下流のフォーム/登録フローはそのまま流用できる）
 *
 * ※ 車検証は個人情報を含む。本機能は画像を外部(Gemini)へ送信する。利用者の同意前提で使うこと。
 */
import { z } from 'zod';

/** Gemini に許可する入力 MIME タイプ */
export const SUPPORTED_OCR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;
export type OcrMimeType = (typeof SUPPORTED_OCR_MIME_TYPES)[number];

export function isSupportedOcrMimeType(mime: string): mime is OcrMimeType {
  return (SUPPORTED_OCR_MIME_TYPES as readonly string[]).includes(mime);
}

/** Gemini からの生の抽出結果（全フィールド文字列・任意） */
const rawExtractionSchema = z.object({
  vehicleNumber: z.string().optional(),
  vin: z.string().optional(),
  modelCode: z.string().optional(),
  registrationDate: z.string().optional(),
  firstRegistrationDate: z.string().optional(),
  inspectionExpiryDate: z.string().optional(),
  ownerName: z.string().optional(),
  ownerAddress: z.string().optional(),
});
export type RawExtraction = z.infer<typeof rawExtractionSchema>;

/**
 * 日付らしき文字列を YYYY-MM-DD に正規化する（不正・空は ''）。
 * 受理: "YYYY-MM-DD" / "YYYY/MM/DD" / "YYYY.MM.DD" / "YYYYMMDD" / "YYYY-MM"(日は01補完)。
 * 和暦は Gemini 側で西暦変換させる方針なので、ここでは数字の正規化のみ行う。
 */
export function normalizeDate(raw: string | undefined): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 8) {
    const [y, m, d] = [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)];
    if (m >= '01' && m <= '12' && d >= '01' && d <= '31') return `${y}-${m}-${d}`;
    return '';
  }
  if (digits.length === 6) {
    const [y, m] = [digits.slice(0, 4), digits.slice(4, 6)];
    if (m >= '01' && m <= '12') return `${y}-${m}-01`;
    return '';
  }
  return '';
}

/**
 * Gemini の生抽出結果を `ParsedInspectionCertificate` に正規化する純粋関数。
 * 文字列はトリム、日付は YYYY-MM-DD に揃える。Gemini 呼び出し無しで単体テスト可能。
 */
export function normalizeExtractedFields(raw: RawExtraction): ParsedInspectionCertificate {
  const s = (v: string | undefined) => (v ?? '').trim();
  return {
    vehicleNumber: s(raw.vehicleNumber),
    vin: s(raw.vin),
    modelCode: s(raw.modelCode),
    registrationDate: normalizeDate(raw.registrationDate),
    firstRegistrationDate: normalizeDate(raw.firstRegistrationDate),
    inspectionExpiryDate: normalizeDate(raw.inspectionExpiryDate),
    ownerName: s(raw.ownerName),
    ownerAddress: s(raw.ownerAddress),
  };
}

/** Gemini に渡す抽出指示プロンプト */
const EXTRACTION_PROMPT = `あなたは日本の自動車検査証（車検証）から情報を読み取る OCR アシスタントです。
渡された画像または PDF は日本の車検証です。記載内容を読み取り、次の項目を JSON で返してください。

- vehicleNumber: 自動車登録番号/車両番号（地域名+分類番号+ひらがな+一連番号。例「品川 500 あ 1234」）
- vin: 車台番号
- modelCode: 型式
- registrationDate: 登録年月日（西暦 YYYY-MM-DD）
- firstRegistrationDate: 初度登録年月（西暦 YYYY-MM-DD。日が不明なら 01）
- inspectionExpiryDate: 有効期間の満了する日（西暦 YYYY-MM-DD）
- ownerName: 使用者の氏名または名称
- ownerAddress: 使用者の住所

ルール:
- 和暦（令和・平成等）は必ず西暦に変換すること。
- 読み取れない項目は空文字 "" にすること（推測で埋めない）。
- 値のみを返し、ラベルや単位は含めないこと。`;

/** Gemini レスポンス（必要部分のみ）の型ガード用スキーマ */
const geminiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({ parts: z.array(z.object({ text: z.string().optional() })).optional() })
          .optional(),
      }),
    )
    .optional(),
});

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    vehicleNumber: { type: 'string' },
    vin: { type: 'string' },
    modelCode: { type: 'string' },
    registrationDate: { type: 'string' },
    firstRegistrationDate: { type: 'string' },
    inspectionExpiryDate: { type: 'string' },
    ownerName: { type: 'string' },
    ownerAddress: { type: 'string' },
  },
} as const;

/** OCR 固有エラー（呼び出し側でユーザー向けメッセージに使う） */
export class OcrError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'OcrError';
  }
}

export type OcrInput = { dataBase64: string; mimeType: OcrMimeType };

// 既定モデル。Google 側の提供終了でバージョンが廃止されることがあるため、
// 廃止時は値を更新するか GEMINI_MODEL env で上書きする（404 が出たら最新の Flash 系へ）。
const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * 車検証の画像/PDF を Gemini Vision で OCR し、構造化結果を返す。
 * @throws OcrError APIキー未設定(503)・Gemini失敗(502)・抽出不可(422)
 */
export async function extractInspectionCertificate(
  input: OcrInput,
  opts?: { apiKey?: string; model?: string; fetchImpl?: typeof fetch },
): Promise<ParsedInspectionCertificate> {
  const apiKey = opts?.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new OcrError(
      'OCR 機能が未設定です（GEMINI_API_KEY）。設定するか手入力で登録してください。',
      503,
    );
  }
  const model = opts?.model ?? process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const doFetch = opts?.fetchImpl ?? fetch;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  let res: Response;
  try {
    res = await doFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: EXTRACTION_PROMPT },
              { inline_data: { mime_type: input.mimeType, data: input.dataBase64 } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });
  } catch (e) {
    throw new OcrError(`OCR サービスへの接続に失敗しました: ${(e as Error).message}`, 502);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new OcrError(`OCR 抽出に失敗しました (HTTP ${res.status}) ${detail.slice(0, 200)}`, 502);
  }

  const json: unknown = await res.json().catch(() => null);
  const parsed = geminiResponseSchema.safeParse(json);
  const text = parsed.success
    ? (parsed.data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '')
    : '';
  if (!text.trim()) {
    throw new OcrError(
      '車検証から情報を読み取れませんでした。画像を確認するか手入力してください。',
      422,
    );
  }

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(text);
  } catch {
    throw new OcrError('OCR 結果の解析に失敗しました。手入力で登録してください。', 422);
  }
  const raw = rawExtractionSchema.safeParse(rawJson);
  if (!raw.success) {
    throw new OcrError('OCR 結果の形式が不正でした。手入力で登録してください。', 422);
  }
  return normalizeExtractedFields(raw.data);
}
