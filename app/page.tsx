import Link from "next/link";
import { getChromeWebStoreUrlWithUtm } from "@/lib/chrome-store";

const memories = [
  {
    label: "Business",
    line: "Who you are. What you charge. What you won't do.",
    bg: "bg-signal",
  },
  {
    label: "Client",
    line: "Who they are. Where they came from. What they want.",
    bg: "bg-proof",
  },
  {
    label: "Project",
    line: "What's agreed. What's excluded. Where the money risks are.",
    bg: "bg-white",
  },
];

export default function HomePage() {
  const chromeStoreUrl = getChromeWebStoreUrlWithUtm("landing");

  return (
    <main>
      <section className="relative border-b border-ink/10 bg-paper">
        <div className="memory-grid absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:py-24">
          <p className="w-fit border-2 border-ink bg-signal px-3 py-1 text-sm font-black uppercase text-ink shadow-[4px_4px_0_#111827]">
            Local-first · No account needed
          </p>

          <h1 className="mt-6 text-5xl font-black leading-none tracking-tight text-ink sm:text-6xl lg:text-7xl">
            Your freelance business
            <br />
            runs on memory.
            <br />
            <span className="text-gray-400">Right now, that&rsquo;s your head.</span>
          </h1>

          <p className="mt-6 max-w-xl text-xl font-bold leading-8 text-gray-700">
            Save your freelance memory once. Use it inside Gmail, LinkedIn, Upwork, and more.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
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
            <a
              href="#memory"
              className="focus-block rounded-md border-2 border-ink bg-white px-8 py-4 text-center text-lg font-black text-ink transition hover:-translate-y-0.5 hover:bg-signal"
            >
              See how it works
            </a>
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
        </div>
      </section>

      <section id="memory" className="border-b border-ink/10 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <p className="text-sm font-black uppercase text-blue-700">What it holds</p>
          <h2 className="mt-3 text-4xl font-black leading-none text-ink sm:text-5xl">
            Three kinds of memory.
            <br />
            One complete picture.
          </h2>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {memories.map((memory) => (
              <div key={memory.label} className="border-2 border-ink bg-paper p-6 shadow-block">
                <span
                  className={`${memory.bg} inline-block border-2 border-ink px-3 py-1 text-xs font-black uppercase text-ink`}
                >
                  {memory.label}
                </span>
                <p className="mt-4 text-xl font-black leading-snug text-ink">{memory.line}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-ink/10 bg-paper">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <p className="text-sm font-black uppercase text-blue-700">The moment it pays off</p>
          <h2 className="mt-3 text-4xl font-black leading-none text-ink sm:text-5xl">
            You know exactly
            <br />
            where you stand.
          </h2>

          <div className="mt-10 border-2 border-ink bg-white shadow-blockLg">
            <div className="border-b-2 border-ink p-5">
              <p className="mb-2 text-xs font-black uppercase text-gray-500">Client message</p>
              <p className="text-base font-black italic text-ink">
                &ldquo;Can you add a dashboard page? I thought we talked about this.&rdquo;
              </p>
            </div>

            <div className="border-b-2 border-ink bg-danger/5 p-5">
              <p className="mb-3 text-xs font-black uppercase text-danger">Project memory</p>
              <div className="flex items-center gap-3">
                <span className="border-2 border-ink bg-danger px-2 py-1 text-xs font-black uppercase text-white">
                  Excluded
                </span>
                <p className="text-base font-black text-ink">Dashboard pages</p>
              </div>
            </div>

            <div className="bg-ink p-5">
              <p className="mb-2 text-xs font-black uppercase text-proof">Your reply — 12 seconds later</p>
              <p className="text-base font-black leading-7 text-white">
                &ldquo;That&rsquo;s outside our current scope. Happy to quote it as a separate add-on.&rdquo;
              </p>
            </div>
          </div>

          <div className="mt-4 border-2 border-danger/40 bg-danger/5 p-5">
            <p className="mb-1 text-xs font-black uppercase text-danger">Without memory</p>
            <p className="text-base font-bold text-gray-700">
              You dig through emails. You&rsquo;re not sure. You say yes. That&rsquo;s 30 hours you won&rsquo;t get paid for.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-ink">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-4xl font-black leading-none text-white sm:text-5xl lg:text-6xl">
            Your next client message
            <br />
            shouldn&rsquo;t cost you money.
          </h2>
          <p className="mt-5 text-lg font-bold text-gray-400">
            Takes 5 minutes to set up. Works on every client conversation after that.
          </p>
          {chromeStoreUrl ? (
            <a
              href={chromeStoreUrl}
              target="_blank"
              rel="noreferrer"
              className="focus-block mt-10 inline-block rounded-md border-2 border-signal bg-signal px-10 py-4 text-xl font-black text-ink transition hover:-translate-y-0.5"
              style={{ boxShadow: "5px 5px 0 rgba(255,255,255,0.15)" }}
            >
              Add to Chrome
            </a>
          ) : (
            <span
              className="mt-10 inline-block rounded-md border-2 border-signal bg-gray-300 px-10 py-4 text-xl font-black text-gray-600"
              style={{ boxShadow: "5px 5px 0 rgba(255,255,255,0.15)" }}
            >
              Add to Chrome
            </span>
          )}
          {!chromeStoreUrl ? (
            <p className="mt-4 text-sm font-bold text-gray-500">Chrome Web Store link is not configured yet.</p>
          ) : (
            <p className="mt-4 text-sm font-bold text-gray-500">No account needed. Your memory stays local in Chrome.</p>
          )}
        </div>
      </section>
    </main>
  );
}
