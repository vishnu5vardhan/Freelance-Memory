import type { Metadata } from "next";
import Link from "next/link";
import { getChromeWebStoreUrlWithUtm } from "@/lib/chrome-store";

export const metadata: Metadata = {
  title: "Welcome to Freelancer Memory",
  description: "Set up the minimum memory Freelancer Memory needs to write useful replies."
};

const fields = [
  ["Role", "What do you do?"],
  ["Services", "What do you sell?"],
  ["Pricing", "How do you charge?"],
  ["Voice", "How should replies sound?"],
  ["Boundaries", "What should the AI never agree to?"],
  ["Proof/results", "Optional wins, testimonials, or results."],
  ["Payment terms", "Optional deposit, invoice, or milestone terms."]
];

const nextSteps = [
  "Open Gmail, LinkedIn, Upwork, Fiverr, or WhatsApp Web",
  "Highlight a client message",
  "Click the FM button",
  "Generate a reply"
];

export default function WelcomePage() {
  const chromeStoreUrl = getChromeWebStoreUrlWithUtm("welcome");

  return (
    <main className="relative min-h-screen overflow-hidden bg-paper">
      <div className="memory-grid absolute inset-0 opacity-50" aria-hidden="true" />
      <section className="relative mx-auto grid max-w-5xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
        <div className="border-2 border-ink bg-white p-6 shadow-blockLg sm:p-8">
          <p className="w-fit border-2 border-ink bg-signal px-3 py-1 text-sm font-black uppercase text-ink shadow-[4px_4px_0_#111827]">
            Welcome
          </p>
          <h1 className="mt-5 text-4xl font-black leading-none tracking-normal text-ink sm:text-5xl">
            Set up your freelance memory
          </h1>
          <p className="mt-5 text-lg font-bold leading-8 text-gray-700">
            This takes 2 minutes. The extension uses this to write replies that sound like you.
          </p>
          <p className="mt-4 text-sm font-bold leading-6 text-gray-600">
            After install, Chrome opens setup inside the extension so it can save to Chrome storage.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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
            <p className="mt-4 text-sm font-bold text-gray-600">Chrome Web Store link is not configured yet.</p>
          ) : null}
        </div>

        <div className="grid gap-6">
          <section className="border-2 border-ink bg-paper p-5 shadow-block">
            <h2 className="text-2xl font-black leading-tight text-ink">What you will add</h2>
            <div className="mt-4 grid gap-3">
              {fields.map(([label, help]) => (
                <div key={label} className="border-2 border-ink bg-white p-3">
                  <p className="text-sm font-black uppercase text-blue-700">{label}</p>
                  <p className="mt-1 text-base font-bold leading-6 text-gray-700">{help}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="border-2 border-ink bg-white p-5 shadow-block">
            <h2 className="text-2xl font-black leading-tight text-ink">What next</h2>
            <ol className="mt-4 grid gap-3">
              {nextSteps.map((step) => (
                <li key={step} className="flex gap-3 text-base font-black leading-6 text-ink">
                  <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-proof" aria-hidden="true" />
                  {step}
                </li>
              ))}
            </ol>
            <p className="mt-5 text-sm font-bold leading-6 text-gray-600">
              Your memory is stored locally in Chrome. Client text is only used when you generate a reply. The extension
              never sends messages automatically.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
