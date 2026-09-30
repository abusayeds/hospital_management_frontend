import Image from "next/image";
import Link from "next/link";

const entries = [
  {
    href: "/chat",
    title: "Testo Life Assistant",
    subtitle: "Patient chat",
    text: "বাংলা বা English-এ প্রশ্ন করুন, ডাক্তার খুঁজুন, সিরিয়াল নিন। WhatsApp-এর মতো।",
    icon: "💬",
  },
  {
    href: "/queue-display",
    title: "Queue Display",
    subtitle: "Waiting room TV",
    text: "কোন ডাক্তারের কাছে এখন কত নম্বর সিরিয়াল চলছে, live দেখুন।",
    icon: "🔢",
  },
  {
    href: "/login",
    title: "Staff Dashboard",
    subtitle: "Reception & admin",
    text: "আজকের appointment, queue নিয়ন্ত্রণ, assistant alert আর hospital analytics।",
    icon: "📊",
  },
];

export default function Home() {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden bg-brand-900 text-white">
        {/* Hospital banner as the background; a light overlay keeps the text readable while the banner stays visible */}
        <Image src="/images/hero-banner.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
        <div aria-hidden className="absolute inset-0 bg-linear-to-r from-brand-900/80 via-brand-900/50 to-brand-900/10" />

        <div className="relative mx-auto max-w-5xl px-4 py-14 sm:py-20">
          <Image
            src="/images/testolife-logo.jpg"
            alt="Testo Life logo"
            width={72}
            height={72}
            priority
            className="mb-6 rounded-2xl bg-white p-1 shadow-lg"
          />
          <p className="text-sm font-medium tracking-wide text-brand-100">TESTOLIFE HOSPITAL · KERANIGANJ</p>
          <h1 className="mt-3 text-3xl leading-tight font-bold text-white sm:text-5xl">Testo Life Assistant</h1>
          <p className="mt-4 max-w-2xl text-lg text-brand-100">
            রোগী chat করে ডাক্তার খুঁজবে ও সিরিয়াল নেবে। জরুরি অবস্থায় সাথে সাথে staff-কে alert দেবে। আর সব কিছু
            real-time-এ reception dashboard-এ দেখা যাবে।
          </p>
        </div>
      </section>

      <section className="relative mx-auto -mt-8 grid max-w-5xl gap-4 px-4 pb-16 sm:grid-cols-3">
        {entries.map((e) => (
          <Link
            key={e.href}
            href={e.href}
            className="group rounded-2xl border border-line bg-surface p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md"
          >
            <div className="text-3xl" aria-hidden>
              {e.icon}
            </div>
            <h2 className="mt-4 text-lg font-semibold text-ink">{e.title}</h2>
            <p className="text-xs font-medium tracking-wide text-ink-3 uppercase">{e.subtitle}</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">{e.text}</p>
            <p className="mt-4 text-sm font-semibold text-brand-600 group-hover:text-brand-700">খুলুন →</p>
          </Link>
        ))}
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="text-sm font-semibold tracking-wide text-ink-3 uppercase">How it works</h2>
        <ol className="mt-4 grid gap-3 text-sm text-ink-2 sm:grid-cols-4">
          {[
            ["Emergency guardrail", "জরুরি শব্দ ধরা পড়লে সাথে সাথে নিরাপদ উত্তর আর staff alert।"],
            ["Smart conversation", "রোগীর ভাষা বুঝে কথা বলে, কিন্তু নিজে diagnosis বা ওষুধ দেয় না।"],
            ["Real data tools", "ডাক্তার, fee, খালি slot সব database থেকে আসে। Assistant কিছু বানিয়ে বলে না।"],
            ["Live dashboard", "Booking আর alert Socket.IO দিয়ে সাথে সাথে reception-এ পৌঁছায়।"],
          ].map(([title, text], i) => (
            <li key={title} className="rounded-xl border border-line bg-surface p-4">
              <span className="text-xs font-semibold text-brand-600">STEP {i + 1}</span>
              <p className="mt-1 font-semibold text-ink">{title}</p>
              <p className="mt-1 leading-relaxed">{text}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
