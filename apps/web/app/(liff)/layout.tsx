import type { ReactNode } from 'react';

export default function LiffLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto min-h-screen max-w-md bg-background px-4 py-6">{children}</div>;
}
