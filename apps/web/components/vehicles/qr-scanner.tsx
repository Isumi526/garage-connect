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

export function QrScanner({ onParsed }: { onParsed: (data: ParsedInspectionCertificate) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [scanning, setScanning] = useState(false);
  // 読み取った復号文字列（中身でユニーク化＝実物の複数コードも全部溜まる）
  const [collected, setCollected] = useState<string[]>([]);
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
    setCollected([]);
    setScanning(true);
    try {
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current ?? undefined,
        (result) => {
          if (!result) return;
          const text = result.getText();
          setCollected((prev) => (prev.includes(text) ? prev : [...prev, text]));
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
    // 車検満了日はデモ動作のため「今日 + 30 日(JST)」を YYYYMMDD で生成
    const expiry = new Date(Date.now() + 30 * 86400000)
      .toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
      .replace(/-/g, '');
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
      inspectionExpiryYYYYMMDD: expiry,
      registrationYYYYMMDD: '20230315',
    });
    setManual(codes.join('\n'));
  };

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
        {collected.length > 0 && (
          <Button type="button" onClick={() => applyTexts(collected)}>
            解析して反映（{collected.length} コード取得）
          </Button>
        )}
      </div>

      {/* 読み取った生データ（実物QRの校正用デバッグ表示）。
          車検証を順にかざすと、各QRの復号テキストがここに溜まります。 */}
      {collected.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
          <p className="mb-1 text-xs font-medium text-amber-800">
            読み取った生データ（{collected.length} 件）—
            校正用にこの内容をコピーして共有してください（氏名・住所はダミーに置換可）
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            {collected.map((t, i) => (
              <li
                key={`${i}-${t.slice(0, 12)}`}
                className="break-all font-mono text-[11px] text-amber-900"
              >
                {t}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* video は常時マウント（条件レンダリングだと start() 時に ref が null になり
          カメラ映像が表示中の要素に繋がらず黒画面になるため）。非表示は CSS で制御。 */}
      <div className={`overflow-hidden rounded-md border bg-black ${scanning ? '' : 'hidden'}`}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="aspect-video w-full object-cover"
        >
          <track kind="captions" />
        </video>
      </div>

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
