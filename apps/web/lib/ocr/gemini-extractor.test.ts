import { describe, expect, it, vi } from 'vitest';
import {
  OcrError,
  extractInspectionCertificate,
  isSupportedOcrMimeType,
  normalizeDate,
  normalizeExtractedFields,
} from './gemini-extractor';

describe('normalizeDate', () => {
  it('accepts common separators and YYYYMMDD', () => {
    expect(normalizeDate('2026-04-01')).toBe('2026-04-01');
    expect(normalizeDate('2026/04/01')).toBe('2026-04-01');
    expect(normalizeDate('2026.04.01')).toBe('2026-04-01');
    expect(normalizeDate('20260401')).toBe('2026-04-01');
  });

  it('completes day for YYYY-MM (初度登録年月)', () => {
    expect(normalizeDate('2020-04')).toBe('2020-04-01');
    expect(normalizeDate('202004')).toBe('2020-04-01');
  });

  it('returns empty for missing or invalid values', () => {
    expect(normalizeDate(undefined)).toBe('');
    expect(normalizeDate('')).toBe('');
    expect(normalizeDate('令和6年')).toBe('');
    expect(normalizeDate('2026-13-01')).toBe('');
    expect(normalizeDate('2026-04-40')).toBe('');
  });
});

describe('normalizeExtractedFields', () => {
  it('trims strings and normalizes dates into ParsedInspectionCertificate', () => {
    expect(
      normalizeExtractedFields({
        vehicleNumber: ' 品川 500 あ 1234 ',
        vin: 'ABC1234567',
        modelCode: 'DBA-GK3',
        registrationDate: '2023/03/15',
        firstRegistrationDate: '2020-04',
        inspectionExpiryDate: '20260401',
        ownerName: '山田太郎',
        ownerAddress: 'テスト市テスト町1-1-1',
      }),
    ).toEqual({
      vehicleNumber: '品川 500 あ 1234',
      vin: 'ABC1234567',
      modelCode: 'DBA-GK3',
      registrationDate: '2023-03-15',
      firstRegistrationDate: '2020-04-01',
      inspectionExpiryDate: '2026-04-01',
      ownerName: '山田太郎',
      ownerAddress: 'テスト市テスト町1-1-1',
    });
  });

  it('fills missing fields with empty strings', () => {
    expect(normalizeExtractedFields({})).toEqual({
      vehicleNumber: '',
      vin: '',
      modelCode: '',
      registrationDate: '',
      firstRegistrationDate: '',
      inspectionExpiryDate: '',
      ownerName: '',
      ownerAddress: '',
    });
  });
});

describe('isSupportedOcrMimeType', () => {
  it('accepts images and pdf, rejects others', () => {
    expect(isSupportedOcrMimeType('image/jpeg')).toBe(true);
    expect(isSupportedOcrMimeType('application/pdf')).toBe(true);
    expect(isSupportedOcrMimeType('image/gif')).toBe(false);
    expect(isSupportedOcrMimeType('text/plain')).toBe(false);
  });
});

describe('extractInspectionCertificate', () => {
  const input = { dataBase64: 'AAAA', mimeType: 'image/jpeg' as const };

  it('throws 503 OcrError when API key is missing', async () => {
    await expect(extractInspectionCertificate(input, { apiKey: undefined })).rejects.toMatchObject({
      name: 'OcrError',
      status: 503,
    });
  });

  it('parses a Gemini JSON response into normalized fields', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    vehicleNumber: '品川 500 あ 1234',
                    vin: 'ABC1234567',
                    modelCode: 'DBA-GK3',
                    registrationDate: '2023-03-15',
                    firstRegistrationDate: '2020-04',
                    inspectionExpiryDate: '2026/04/01',
                    ownerName: '山田太郎',
                    ownerAddress: 'テスト市テスト町1-1-1',
                  }),
                },
              ],
            },
          },
        ],
      }),
    })) as unknown as typeof fetch;

    const result = await extractInspectionCertificate(input, { apiKey: 'k', fetchImpl });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(result.vin).toBe('ABC1234567');
    expect(result.firstRegistrationDate).toBe('2020-04-01');
    expect(result.inspectionExpiryDate).toBe('2026-04-01');
    expect(result.ownerName).toBe('山田太郎');
  });

  it('throws 422 when the model returns no usable text', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: '' }] } }] }),
    })) as unknown as typeof fetch;
    await expect(
      extractInspectionCertificate(input, { apiKey: 'k', fetchImpl }),
    ).rejects.toBeInstanceOf(OcrError);
  });

  it('throws 502 when Gemini responds non-OK', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => 'boom',
    })) as unknown as typeof fetch;
    await expect(
      extractInspectionCertificate(input, { apiKey: 'k', fetchImpl }),
    ).rejects.toMatchObject({ status: 502 });
  });
});
