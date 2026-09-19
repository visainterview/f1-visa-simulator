import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'U.S. Embassy F-1 Visa Simulator - Kathmandu Post',
  description: 'AI Consular Officer F-1 Mock Interview System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}