import { BookingApp } from '@/components/liff/booking-app';

// LIFF は完全クライアント駆動（LINE ユーザー特定が必要）
export const dynamic = 'force-dynamic';

export default function LiffBookingPage() {
  return <BookingApp />;
}
