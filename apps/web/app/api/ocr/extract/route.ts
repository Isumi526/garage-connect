import {
  OcrError,
  extractInspectionCertificate,
  isSupportedOcrMimeType,
} from '@/lib/ocr/gemini-extractor';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Vercel のサーバレス body 上限(約4.5MB)に収める安全側の上限 */
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * 車検証の画像/PDF を受け取り、Gemini Vision で OCR して
 * `ParsedInspectionCertificate` を返す。ログイン済み店舗ユーザーのみ。
 */
export async function POST(req: Request) {
  // 認証（API キーは秘匿。ログイン済みユーザーのみ OCR を実行できる）
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'ファイルの受信に失敗しました' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: '車検証の画像または PDF を選択してください' },
      { status: 400 },
    );
  }
  if (!isSupportedOcrMimeType(file.type)) {
    return NextResponse.json({ error: '対応形式は JPEG / PNG / WebP / PDF です' }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'ファイルサイズが大きすぎます（4MB 以内にしてください）' },
      { status: 413 },
    );
  }

  const dataBase64 = Buffer.from(await file.arrayBuffer()).toString('base64');

  try {
    const parsed = await extractInspectionCertificate({ dataBase64, mimeType: file.type });
    return NextResponse.json(parsed);
  } catch (e) {
    if (e instanceof OcrError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: 'OCR 処理中にエラーが発生しました。手入力で登録してください。' },
      { status: 500 },
    );
  }
}
