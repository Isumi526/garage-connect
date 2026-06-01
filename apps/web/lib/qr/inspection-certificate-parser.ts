/**
 * 自動車検査証（車検証）二次元コード パーサー
 * ============================================================
 * 国交省仕様の車検証には複数の QR コードが印字されており、
 * 1 つの論理レコードが容量の都合で複数コードに分割されている。
 * CLAUDE.md の方針に従い、② ③ ④ を連結して「車両情報レコード(A)」、
 * ⑤ ⑥ を連結して「有効期間レコード(B)」として復元し、フィールドを抽出する。
 *
 * 各コードのペイロードは `"<コード番号>/<データ>"` 形式とみなす。
 * 同一論理レコードに属するコードのデータは（区切り無しで）連結してから
 * 半角スペースで項目分割する。
 *
 * ⚠️ 実際の車検証のフィールド位置（オフセット）は実物での校正が必要。
 *    本物の車検証は個人情報を含むためリポジトリにサンプルを置けない。
 *    位置は下記の定数に集約してあるので、実物確認後にここだけ調整する。
 */

export interface ParsedInspectionCertificate {
  vehicleNumber: string;
  vin: string;
  modelCode: string;
  registrationDate: string; // YYYY-MM-DD
  firstRegistrationDate: string; // YYYY-MM-DD（初度登録年月。日は 01 で補完）
  inspectionExpiryDate: string; // YYYY-MM-DD
  ownerName: string;
  ownerAddress: string;
}

/** レコード A（②③④ 連結）の項目位置 */
const A = {
  REGION: 1, // 運輸支局・地域名（例: 品川）
  CLASS_NO: 2, // 分類番号（例: 500）
  KANA: 3, // ひらがな（例: あ）
  SERIAL_NO: 4, // 一連指定番号（例: 1234）
  VIN: 5, // 車台番号
  MODEL_CODE: 6, // 型式
  FIRST_REG: 7, // 初度登録年月（YYYYMM）
  OWNER_NAME: 8, // 使用者の氏名・名称
  OWNER_ADDRESS: 9, // 使用者の住所
} as const;

/** レコード B（⑤⑥ 連結）の項目位置 */
const B = {
  INSPECTION_EXPIRY: 1, // 有効期間の満了する日（YYYYMMDD）
  REGISTRATION_DATE: 2, // 登録年月日（YYYYMMDD）
} as const;

const FIELD_DELIMITER = ' ';
const CODE_PREFIX = /^(\d+)\//;

/** "YYYYMMDD" / "YYYYMM" → "YYYY-MM-DD"（不正値は空文字） */
function toIsoDate(raw: string | undefined): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
  if (digits.length === 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-01`;
  }
  return '';
}

/** 車両番号（地域 分類 かな 一連）を 1 つの表示文字列へ結合 */
function buildVehicleNumber(fields: string[]): string {
  const parts = [A.REGION, A.CLASS_NO, A.KANA, A.SERIAL_NO]
    .map((i) => fields[i] ?? '')
    .filter((s) => s !== '');
  return parts.join(' ');
}

type Grouped = { a: string[]; b: string[] };

/**
 * コード番号プレフィックス付きのQR文字列群を、論理レコード A/B に連結する。
 * 番号が付いていない場合は走査順で 2..6 を割り当てる。
 */
function groupByLogicalRecord(qrTexts: string[]): Grouped {
  const byCode = new Map<number, string>();
  let fallback = 2;
  for (const text of qrTexts) {
    const m = text.match(CODE_PREFIX);
    if (m?.[1]) {
      byCode.set(Number(m[1]), text.replace(CODE_PREFIX, ''));
    } else {
      byCode.set(fallback++, text);
    }
  }
  const concat = (codes: number[]) => codes.map((c) => byCode.get(c) ?? '').join('');
  return {
    a: concat([2, 3, 4]).split(FIELD_DELIMITER),
    b: concat([5, 6]).split(FIELD_DELIMITER),
  };
}

/**
 * 連結二次元コードを解析して車検証情報を返す。
 * @param qrTexts スキャンで得た各QRの復号文字列（順不同可・コード番号プレフィックス推奨）
 */
export function parseConnectedQRCodes(qrTexts: string[]): ParsedInspectionCertificate {
  if (!qrTexts || qrTexts.length === 0) {
    throw new Error('QR コードが読み取れませんでした');
  }
  const { a, b } = groupByLogicalRecord(qrTexts);

  return {
    vehicleNumber: buildVehicleNumber(a),
    vin: a[A.VIN] ?? '',
    modelCode: a[A.MODEL_CODE] ?? '',
    firstRegistrationDate: toIsoDate(a[A.FIRST_REG]),
    registrationDate: toIsoDate(b[B.REGISTRATION_DATE]),
    inspectionExpiryDate: toIsoDate(b[B.INSPECTION_EXPIRY]),
    ownerName: a[A.OWNER_NAME] ?? '',
    ownerAddress: a[A.OWNER_ADDRESS] ?? '',
  };
}

/**
 * テスト・デモ用：構造化データから車検証の連結QR文字列（コード②〜⑥）を生成する。
 * parseConnectedQRCodes と往復可能。実物QRの代用として「一発登録」デモに使う。
 */
export function buildDummyInspectionQRCodes(data: {
  region: string;
  classNo: string;
  kana: string;
  serialNo: string;
  vin: string;
  modelCode: string;
  firstRegYYYYMM: string;
  ownerName: string;
  ownerAddress: string;
  inspectionExpiryYYYYMMDD: string;
  registrationYYYYMMDD: string;
}): string[] {
  const aFields: string[] = [];
  aFields[0] = 'GC'; // 予備（バージョン識別子）
  aFields[A.REGION] = data.region;
  aFields[A.CLASS_NO] = data.classNo;
  aFields[A.KANA] = data.kana;
  aFields[A.SERIAL_NO] = data.serialNo;
  aFields[A.VIN] = data.vin;
  aFields[A.MODEL_CODE] = data.modelCode;
  aFields[A.FIRST_REG] = data.firstRegYYYYMM;
  aFields[A.OWNER_NAME] = data.ownerName;
  aFields[A.OWNER_ADDRESS] = data.ownerAddress;
  const recordA = aFields.map((f) => f ?? '').join(FIELD_DELIMITER);

  const bFields: string[] = [];
  bFields[0] = 'GC';
  bFields[B.INSPECTION_EXPIRY] = data.inspectionExpiryYYYYMMDD;
  bFields[B.REGISTRATION_DATE] = data.registrationYYYYMMDD;
  const recordB = bFields.map((f) => f ?? '').join(FIELD_DELIMITER);

  // 容量分割を模して 2 文字目以降で分割し、コード②〜⑥に割り当てる
  const aMid = Math.ceil(recordA.length / 3);
  const a2 = recordA.slice(0, aMid);
  const a3 = recordA.slice(aMid, aMid * 2);
  const a4 = recordA.slice(aMid * 2);
  const bMid = Math.ceil(recordB.length / 2);
  const b5 = recordB.slice(0, bMid);
  const b6 = recordB.slice(bMid);

  return [`2/${a2}`, `3/${a3}`, `4/${a4}`, `5/${b5}`, `6/${b6}`];
}
