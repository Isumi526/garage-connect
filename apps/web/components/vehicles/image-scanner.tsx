'use client';

import { Button } from '@/components/ui/button';
import type { ParsedInspectionCertificate } from '@/lib/qr/inspection-certificate-parser';
import { useRef, useState } from 'react';

const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

/**
 * 車検証の画像/PDF をアップロードして OCR(/api/ocr/extract)で読み取り、
 * 結果を onParsed で親(ScanFlow)に渡す。QrScanner と同じ onParsed インターフェース。
 */
export function ImageScanner({
  onParsed,
}: {
  onParsed: (data: ParsedInspectionCertificate) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(f: File | null) {
    setError(null);
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f?.type.startsWith('image/') ? URL.createObjectURL(f) : null);
  }

  async function analyze() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/ocr/extract', { method: 'POST', body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? 'OCR に失敗しました。手入力で登録してください。');
        return;
      }
      onParsed(json as ParsedInspectionCertificate);
    } catch {
      setError('通信に失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        車検証の写真（JPEG/PNG/WebP）または PDF
        を選んで「解析する」を押すと、記載内容を読み取って下のフォームに自動入力します。
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
          ファイルを選択
        </Button>
        <span className="text-sm text-muted-foreground">
          {file ? file.name : '未選択（4MB 以内）'}
        </span>
      </div>

      {previewUrl && (
        <img
          src={previewUrl}
          alt="車検証プレビュー"
          className="max-h-64 rounded-md border object-contain"
        />
      )}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={analyze} disabled={!file || loading}>
          {loading ? '解析中…' : '解析する'}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
