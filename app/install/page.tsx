import type { Metadata } from "next";
import Link from "next/link";
import { getChromeWebStoreUrlWithUtm } from "@/lib/chrome-store";

export const metadata: Metadata = {
  title: "Install Freelancer Memory",
  description: "Add Freelancer Memory to Chrome and generate your first client reply."
};

const steps = [
  "Add Freelancer Memory to Chrome",
  "Pin the extension",
  "Open a client message and generate your first reply"
];

export default function InstallPage() {
  const chromeStoreUrl = getChromeWebStoreUrlWithUtm("install");

  return (
    <main className="relative min-h-screen overflow-hidden bg-paper">
      <div className="memory-grid absolute inset-0 opacity-50" aria-hidden="true" />
      <section className="relative mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="border-2 border-ink bg-white p-6 shadow-blockLg sm:p-8">
          <p className="w-fit border-2 border-ink bg-signal px-3 py-1 text-sm font-black uppercase text-ink shadow-[4px_4px_0_#111827]">
            Freelancer Memory
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-none tracking-normal text-ink sm:text-5xl">
            Install once. Reply from memory everywhere.
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-bold leading-8 text-gray-700">
            Save your freelance memory once. Use it inside Gmail, LinkedIn, Upwork, and more.
          </p>

          <div className="mt-8 grid gap-3">
            {steps.map((step, index) => (
              <div key={step} className="flex gap-4 border-2 border-ink bg-paper p-4 shadow-block">
                <span className="grid h-9 w-9 shrink-0 place-items-center border-2 border-ink bg-proof text-base font-black text-ink">
                  {index + 1}
                </span>
                <p className="self-center text-lg font-black leading-snug text-ink">{step}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            {chromeStoreUrl ? (
              <a
                href={chromeStoreUrl}
                target="_blank"
                rel="noreferrer"
                className="focus-block rounded-md border-2 border-ink bg-ink px-8 py-4 text-center text-lg font-black text-white shadow-[5px_5px_0_#f5d547] transition hover:-translate-y-0.5 hover:bg-gray-900"
              >
                Add to Chrome
              </a>
            ) : (
              <span className="rounded-md border-2 border-ink bg-gray-200 px-8 py-4 text-center text-lg font-black text-gray-500 shadow-[5px_5px_0_#f5d547]">
                Add to Chrome
              </span>
            )}
            <Link
              href="/privacy"
              className="focus-block rounded-md border-2 border-ink bg-white px-8 py-4 text-center text-lg font-black text-ink transition hover:-translate-y-0.5 hover:bg-signal"
            >
              Privacy policy
            </Link>
          </div>

          {!chromeStoreUrl ? (
            <p className="mt-4 text-sm font-bold text-gray-600">
              Chrome Web Store link is not configured yet.{" "}
              <Link href="/workspace" className="font-black text-ink underline decoration-2 underline-offset-4">
                Try the web demo
              </Link>
              .
            </p>
          ) : null}

          <p className="mt-6 border-2 border-ink bg-proof/20 p-4 text-sm font-black leading-6 text-ink">
            Your memory is saved locally in Chrome. Client text is only used when you generate a reply. Freelancer Memory
            never sends messages automatically.
          </p>
        </div>
      </section>
    </main>
  );
}
