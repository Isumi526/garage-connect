'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  type ParsedInspectionCertificate,
  buildDummyInspectionQRCodes,
  parseConnectedQRCodes,
} from '@/lib/qr/inspection-certificate-parser';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { useEffect, useRef, useState } from 'react';

/** 復号文字列の先頭コード番号を返す（無ければ null） */
function codeNumberOf(text: string): number | null {
  const m = text.match(/^(\d+)\//);
  return m?.[1] ? Number(m[1]) : null;
}

export function QrScanner({ onParsed }: { onParsed: (data: ParsedInspectionCertificate) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [collected, setCollected] = useState<Map<number, string>>(new Map());
  const [manual, setManual] = useState('');
  const [error, setError] = useState<string | null>(null);

  const stop = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  };

  // アンマウント時にカメラを確実に停止する（controlsRef 経由で依存を持たない）
  useEffect(
    () => () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    },
    [],
  );

  const start = async () => {
    setError(null);
    setScanning(true);
    try {
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current ?? undefined,
        (result) => {
          if (!result) return;
          const text = result.getText();
          const code = codeNumberOf(text) ?? 0;
          setCollected((prev) => {
            const next = new Map(prev);
            next.set(code, text);
            return next;
          });
        },
      );
      controlsRef.current = controls;
    } catch (e) {
      setError(`カメラを起動できませんでした: ${e instanceof Error ? e.message : String(e)}`);
      setScanning(false);
    }
  };

  const applyTexts = (texts: string[]) => {
    setError(null);
    try {
      onParsed(parseConnectedQRCodes(texts));
      stop();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'QR の解析に失敗しました');
    }
  };

  const loadDemo = () => {
    const codes = buildDummyInspectionQRCodes({
      region: '品川',
      classNo: '500',
      kana: 'あ',
      serialNo: '1234',
      vin: 'ABC1234567',
      modelCode: 'DBA-GK3',
      firstRegYYYYMM: '202004',
      ownerName: '山田太郎',
      ownerAddress: 'テスト市テスト町1-1-1',
      inspectionExpiryYYYYMMDD: '20260401',
      registrationYYYYMMDD: '20230315',
    });
    setManual(codes.join('\n'));
  };

  const collectedCodes = [...collected.keys()].filter((c) => c > 0).sort();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {!scanning ? (
          <Button type="button" onClick={start}>
            カメラでスキャン開始
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={stop}>
            停止
          </Button>
        )}
        {scanning && collected.size > 0 && (
          <Button type="button" onClick={() => applyTexts([...collected.values()])}>
            解析して反映（{collectedCodes.length} コード取得）
          </Button>
        )}
      </div>

      {scanning && (
        <div className="overflow-hidden rounded-md border bg-black">
          {/* biome-ignore lint/a11y/useMediaCaption: ライブカメラ映像のため字幕は不要 */}
          <video ref={videoRef} className="aspect-video w-full" />
        </div>
      )}

      <div className="rounded-md border bg-muted/30 p-4">
        <p className="mb-2 text-sm font-medium">
          テキスト貼り付け / デモ（カメラが使えない環境用）
        </p>
        <p className="mb-2 text-xs text-muted-foreground">
          各QRの復号文字列を改行区切りで貼り付けます。動作確認には「デモQRを生成」を使用。
        </p>
        <Textarea
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          rows={5}
          placeholder={'2/...\n3/...\n4/...\n5/...\n6/...'}
          className="font-mono text-xs"
        />
        <div className="mt-2 flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={loadDemo}>
            デモQRを生成
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() =>
              applyTexts(
                manual
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
            disabled={manual.trim() === ''}
          >
            貼り付けたQRを解析
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
