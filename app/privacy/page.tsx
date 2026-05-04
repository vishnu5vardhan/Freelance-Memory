import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Freelancer Memory",
  description: "How Freelancer Memory handles local memory, client text, AI requests, and usage logging."
};

const sections = [
  {
    title: "What Freelancer Memory Stores",
    body: [
      "Freelancer Memory stores your business memory locally in your browser using Chrome extension storage. This can include your services, pricing, proof, process, boundaries, voice, social links, client notes, and project notes.",
      "This local memory is saved on the browser where you use the extension. It is used to help generate replies that match your freelance business."
    ]
  },
  {
    title: "When Client Text Is Sent",
    body: [
      "Client or page text is sent to the Freelancer Memory backend only when you choose an action that needs it: Generate reply, Use page, Use highlight, or the in-page FM action.",
      "The extension is designed to help you pull relevant context on demand. It does not send page text to the backend just because you browse a page."
    ]
  },
  {
    title: "AI Processing",
    body: [
      "When you generate a reply, the Freelancer Memory backend sends the relevant request text, your selected context, and saved business memory to OpenAI so OpenAI can generate the reply.",
      "The generated reply is returned to the extension so you can review it, copy it, or insert it into the page. Freelancer Memory does not send messages for you."
    ]
  },
  {
    title: "Data We Do Not Sell",
    body: [
      "Freelancer Memory does not sell user data.",
      "Freelancer Memory does not intentionally store client message content in Supabase. The product is built to keep client and business memory local-first in the browser."
    ]
  },
  {
    title: "Optional Usage Logging",
    body: [
      "If usage logging is enabled on the backend, Freelancer Memory stores metadata only. This can include source, requested intent, detected intent, risk level, token counts, character counts, timestamps, and an install id.",
      "This logging is used to understand product reliability, cost, and beta usage patterns. It is not meant to store the content of client messages."
    ]
  },
  {
    title: "Clearing Your Data",
    body: [
      "You can clear extension data by removing the Freelancer Memory Chrome extension or by clearing Chrome extension storage for Freelancer Memory.",
      "After data is cleared, the extension will no longer have access to the local memory saved in that browser."
    ]
  },
  {
    title: "Contact",
    body: ["Questions or support requests can be sent to support@freelancer-memory.com."]
  }
];

export default function PrivacyPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-paper">
      <div className="memory-grid absolute inset-0 opacity-50" aria-hidden="true" />
      <section className="relative mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="border-2 border-ink bg-white p-6 shadow-blockLg sm:p-8">
          <p className="w-fit border-2 border-ink bg-signal px-3 py-1 text-sm font-black uppercase text-ink shadow-[4px_4px_0_#111827]">
            Privacy Policy
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-none tracking-normal text-ink sm:text-5xl">
            Simple privacy for a local-first reply tool.
          </h1>
          <p className="mt-5 text-base font-bold leading-7 text-gray-700">
            Freelancer Memory helps freelancers generate better client replies from saved business context. This page
            explains what is stored locally, what is sent for generation, and what is logged.
          </p>
          <p className="mt-3 text-sm font-black uppercase text-gray-600">Last updated: May 4, 2026</p>
        </div>

        <div className="mt-6 grid gap-4">
          {sections.map((section) => (
            <section key={section.title} className="border-2 border-ink bg-white p-5 shadow-block sm:p-6">
              <h2 className="text-2xl font-black leading-tight text-ink">{section.title}</h2>
              <div className="mt-4 grid gap-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-base font-bold leading-7 text-gray-700">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
