/** 顧客 CSV インポート用テンプレートのダウンロード（ダミー1行入り） */
export function GET() {
  const header = '種別,氏名,フリガナ,電話番号,メール,郵便番号,住所,法人名,代表者名,メモ';
  const sample =
    '個人,山田太郎,ヤマダタロウ,090-0000-0000,test@example.com,000-0000,テスト市テスト町1-1-1,,,サンプル行';
  // Excel で文字化けしないよう BOM を付与
  const csv = `﻿${header}\n${sample}\n`;
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="customers_template.csv"',
    },
  });
}
