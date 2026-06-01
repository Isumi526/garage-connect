import type { Metadata } from 'next';

export const metadata: Metadata = { title: '特定商取引法に基づく表記 | Garage Connect' };

export default function TokushohoPage() {
  const rows: { label: string; value: string }[] = [
    { label: '販売事業者', value: '（事業者名を記載）' },
    { label: '運営責任者', value: '（責任者氏名を記載）' },
    { label: '所在地', value: '（所在地を記載。請求があれば遅滞なく開示）' },
    { label: 'お問い合わせ', value: '（メールアドレス等を記載）' },
    { label: '販売価格', value: 'スタンダード ¥3,000/月、プロ ¥8,000/月（税込）' },
    { label: '商品代金以外の必要料金', value: 'なし（通信料はお客様負担）' },
    { label: '支払方法', value: 'クレジットカード（Stripe）' },
    { label: '支払時期', value: '毎月の課金日に自動決済' },
    { label: 'サービス提供時期', value: '決済完了後ただちに利用可能' },
    {
      label: '返品・解約',
      value:
        'デジタルサービスの性質上、決済済み期間分の返金は行いません。解約は次回更新日の前日まで可能です。',
    },
  ];

  return (
    <>
      <h1 className="text-2xl font-bold">特定商取引法に基づく表記</h1>
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b align-top">
              <th className="w-40 py-3 pr-4 text-left font-medium text-foreground">{r.label}</th>
              <td className="py-3 text-muted-foreground">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-8 text-xs">※ （ ）内は実際の事業者情報に置き換えてください。</p>
    </>
  );
}
