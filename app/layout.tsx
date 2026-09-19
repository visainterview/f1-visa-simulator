import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'U.S. Embassy F-1 Visa Simulator - Kathmandu Post',
  description: 'AI Consular Officer F-1 Mock Interview with Puter.js Neural Voice',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Free, Unlimited Puter.js Neural Voice Engine */}
        <Script
          src="https://js.puter.com/v2/"
          strategy="beforeInteractive"
        />
      </head>
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}