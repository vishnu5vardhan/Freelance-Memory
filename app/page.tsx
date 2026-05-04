import Link from "next/link";

const situations = [
  "First reply",
  "Pricing answer",
  "Scope cleanup",
  "Follow-up",
  "Push back",
  "Profile form"
];

const memory = ["Services", "Pricing", "Proof", "Process", "Boundaries", "Voice"];

export default function HomePage() {
  return (
    <main className="overflow-hidden">
      <section className="relative border-b border-ink/10 bg-paper">
        <div className="memory-grid absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:py-20">
          <div className="flex flex-col justify-center">
            <p className="w-fit border-2 border-ink bg-signal px-3 py-1 text-sm font-black uppercase text-ink shadow-[4px_4px_0_#111827]">
              Local-first AI workspace
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-black leading-none tracking-normal text-ink sm:text-6xl lg:text-7xl">
              Save your freelance business once
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-700 sm:text-xl">
              Paste any client message. Get a reply that uses your services, pricing, proof, process, boundaries, and voice.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/workspace"
                className="focus-block rounded-md border-2 border-ink bg-ink px-6 py-3 text-center text-base font-black text-white shadow-[5px_5px_0_#f5d547] transition hover:-translate-y-0.5 hover:bg-gray-900"
              >
                Build memory
              </Link>
              <a
                href="#structure"
                className="focus-block rounded-md border-2 border-ink bg-white px-6 py-3 text-center text-base font-black text-ink transition hover:-translate-y-0.5 hover:bg-signal"
              >
                See structure
              </a>
            </div>
          </div>

          <div className="self-center border-2 border-ink bg-white shadow-blockLg">
            <div className="flex items-center justify-between border-b-2 border-ink bg-[#f3f0ea] px-4 py-3">
              <div className="flex gap-2" aria-hidden="true">
                <span className="h-3 w-3 rounded-full border border-ink bg-danger" />
                <span className="h-3 w-3 rounded-full border border-ink bg-signal" />
                <span className="h-3 w-3 rounded-full border border-ink bg-proof" />
              </div>
              <p className="text-xs font-black uppercase text-gray-600">memory -&gt; reply</p>
            </div>
            <div className="grid gap-0 sm:grid-cols-[0.8fr_1.2fr]">
              <div className="border-b-2 border-ink bg-paper p-5 sm:border-b-0 sm:border-r-2">
                <p className="text-sm font-black uppercase text-gray-600">Business memory</p>
                <div className="mt-4 grid gap-2">
                  {memory.map((item) => (
                    <div key={item} className="border border-ink/15 bg-white px-3 py-3 text-sm font-black text-ink">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm font-black uppercase text-gray-600">Client message</p>
                <div className="mt-3 border-2 border-ink bg-paper p-4 text-sm font-bold leading-6 text-gray-800">
                  Hey, can you build our landing page? Need it fast. Budget?
                </div>
                <p className="mt-5 text-sm font-black uppercase text-gray-600">Generated reply</p>
                <div className="mt-3 border-2 border-ink bg-ink p-4 text-sm font-bold leading-6 text-white">
                  Thanks. I can help, but I need scope before a real quote. My landing page projects start at $X and include...
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="structure" className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-black uppercase text-blue-700">What it speaks for</p>
            <h2 className="mt-3 text-4xl font-black leading-none text-ink sm:text-5xl">
              Not a chatbot. A reply machine.
            </h2>
          </div>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {situations.map((item) => (
              <div key={item} className="border-2 border-ink bg-paper p-5 transition hover:-translate-y-1 hover:shadow-block">
                <h3 className="text-xl font-black text-ink">{item}</h3>
                <p className="mt-3 text-sm font-bold leading-6 text-gray-700">
                  One click output from the same saved business context.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
