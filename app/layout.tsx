import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Freelancer Memory",
  description: "Save your freelance business once. Reply faster forever."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper font-sans antialiased">
        <header className="border-b border-ink/10 bg-paper/95">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2 text-lg font-black text-ink focus-block">
              <span className="h-3 w-3 rounded-full bg-proof" aria-hidden="true" />
              Freelancer Memory
            </Link>
            <nav className="flex items-center gap-2" aria-label="Primary navigation">
              <Link
                href="/privacy"
                className="focus-block rounded-md px-3 py-2 text-sm font-black text-ink transition hover:bg-white"
              >
                Privacy
              </Link>
              <Link
                href="/workspace"
                className="focus-block rounded-md border-2 border-ink bg-ink px-4 py-2 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-gray-900"
              >
                Open app
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
