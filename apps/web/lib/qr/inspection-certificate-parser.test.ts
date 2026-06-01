import { describe, expect, it } from 'vitest';
import {
  buildDummyInspectionQRCodes,
  parseConnectedQRCodes,
} from './inspection-certificate-parser';

const DUMMY = {
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
};

describe('parseConnectedQRCodes', () => {
  it('ダミーQR(②〜⑥)を往復して車検証情報を復元する', () => {
    const codes = buildDummyInspectionQRCodes(DUMMY);
    expect(codes).toHaveLength(5);

    const parsed = parseConnectedQRCodes(codes);
    expect(parsed.vehicleNumber).toBe('品川 500 あ 1234');
    expect(parsed.vin).toBe('ABC1234567');
    expect(parsed.modelCode).toBe('DBA-GK3');
    expect(parsed.firstRegistrationDate).toBe('2020-04-01');
    expect(parsed.inspectionExpiryDate).toBe('2026-04-01');
    expect(parsed.registrationDate).toBe('2023-03-15');
    expect(parsed.ownerName).toBe('山田太郎');
    expect(parsed.ownerAddress).toBe('テスト市テスト町1-1-1');
  });

  it('コード番号プレフィックスが順不同でも連結できる', () => {
    const codes = buildDummyInspectionQRCodes(DUMMY);
    const shuffled = [codes[4], codes[1], codes[3], codes[0], codes[2]] as string[];
    const parsed = parseConnectedQRCodes(shuffled);
    expect(parsed.vin).toBe('ABC1234567');
    expect(parsed.inspectionExpiryDate).toBe('2026-04-01');
  });

  it('空配列はエラーを投げる', () => {
    expect(() => parseConnectedQRCodes([])).toThrow();
  });

  it('YYYYMM の初度登録は日を 01 で補完する', () => {
    const parsed = parseConnectedQRCodes(
      buildDummyInspectionQRCodes({ ...DUMMY, firstRegYYYYMM: '201912' }),
    );
    expect(parsed.firstRegistrationDate).toBe('2019-12-01');
  });
});
