import 'server-only';
import QRCode from 'qrcode';

/** テキストから QR コードの PNG data URL を生成する（<img src> で表示） */
export async function qrDataUrl(text: string, size = 240): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
}
