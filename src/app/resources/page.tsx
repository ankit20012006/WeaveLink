import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  Boxes,
  GraduationCap,
  Landmark,
  Languages,
} from "lucide-react";

export const metadata = {
  title: "Weaver resources",
  description:
    "A simple starting point for official handloom training, market access, GI, raw-material, and seller resources.",
};

const resources = [
  {
    title: "Indiahandmade seller onboarding",
    description:
      "Review seller documents, registration guidance, product-upload requirements, and marketplace support.",
    href: "https://www.indiahandmade.com/marketplace/",
    label: "Market access",
    icon: Landmark,
  },
  {
    title: "Handloom Development resources",
    description:
      "Find official schemes, Weaver Service Centres, statistics, notices, and sector programmes.",
    href: "https://handlooms.nic.in/",
    label: "Government",
    icon: BookOpen,
  },
  {
    title: "Raw Material Supply Scheme",
    description:
      "Understand the official framework for yarn and other eligible raw-material support.",
    href: "https://handlooms.nic.in/assets/img/RMSS_Guidelines_01_07_2024.pdf",
    label: "Raw materials",
    icon: Boxes,
  },
  {
    title: "GI Registry and authorized users",
    description:
      "Search registered Geographical Indications and verify authorized users before making GI claims.",
    href: "https://search.ipindia.gov.in/GIRPublicSearch/",
    label: "Identity and GI",
    icon: BadgeCheck,
  },
  {
    title: "Government e-Marketplace",
    description:
      "Explore seller registration and government procurement requirements for eligible products and organizations.",
    href: "https://gem.gov.in/",
    label: "Institutional buyers",
    icon: Landmark,
  },
  {
    title: "Digital learning pathway",
    description:
      "Start with product photos, pricing, safe digital payments, order communication, packaging, and customer care.",
    href: "#learning-path",
    label: "Skills",
    icon: GraduationCap,
  },
];

const learningSteps = [
  {
    number: "01",
    title: "Tell the product facts",
    body: "Practice recording material, technique, dimensions, time taken, care, available quantity, and the smallest realistic order.",
  },
  {
    number: "02",
    title: "Create trustworthy photos",
    body: "Use daylight and capture the full piece, texture, reverse side, scale, borders, labels, and any natural handmade variation.",
  },
  {
    number: "03",
    title: "Price the work",
    body: "Include material, every person's labor, packaging, transport, platform charges, returns risk, and a sustainable artisan earning.",
  },
  {
    number: "04",
    title: "Commit only real capacity",
    body: "Check material and current loom work before accepting quantity or date. Handmade production should not imitate unlimited factory stock.",
  },
  {
    number: "05",
    title: "Ship and record safely",
    body: "Photograph the item before sealing, use moisture protection, retain tracking, and never share unnecessary personal information.",
  },
  {
    number: "06",
    title: "Review the settlement",
    body: "Compare buyer price, every deduction, delivery date, and bank receipt. Ask for clarification before accepting unexplained charges.",
  },
];

export default function ResourcesPage() {
  return (
    <div className="hero-wash grain min-h-full">
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-16 sm:px-6 sm:pt-20">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-soft px-3 py-1 text-xs font-medium text-indigo">
            <Languages size={14} />
            Weaver learning and support
          </span>
          <h1 className="mt-5 font-display text-4xl leading-tight text-indigo sm:text-6xl">
            Digital skills should feel like loom-side guidance.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            A small, practical collection of official resources and transaction
            skills for artisans, cooperatives, and facilitators. Regional-language
            lessons and audio guidance are part of the planned pilot.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => {
            const Icon = resource.icon;
            const external = resource.href.startsWith("http");

            return (
              <Link
                key={resource.title}
                href={resource.href}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer" : undefined}
                className="group rounded-2xl border border-[var(--line)] bg-paper p-5 shadow-[var(--shadow)] transition hover:-translate-y-0.5 hover:border-indigo/25"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-loom-soft text-loom">
                    <Icon size={18} />
                  </span>
                  <ArrowUpRight
                    size={17}
                    className="text-muted transition group-hover:text-indigo"
                  />
                </div>
                <p className="mt-5 text-[11px] uppercase tracking-[0.16em] text-muted">
                  {resource.label}
                </p>
                <h2 className="mt-1 font-display text-xl text-indigo">
                  {resource.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {resource.description}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section
        id="learning-path"
        className="border-y border-[var(--line)] bg-paper"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
            Start here
          </p>
          <h2 className="mt-2 max-w-2xl font-display text-3xl text-indigo sm:text-4xl">
            Six skills behind a safer digital sale
          </h2>
          <div className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">
            {learningSteps.map((step) => (
              <article
                key={step.number}
                className="grid grid-cols-[2.5rem_1fr] gap-4 border-t border-indigo/15 pt-5"
              >
                <span className="font-mono text-xs text-warp-gold">
                  {step.number}
                </span>
                <div>
                  <h3 className="font-display text-xl text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {step.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-[1.75rem] bg-indigo p-7 text-paper sm:p-10">
          <p className="text-[11px] uppercase tracking-[0.18em] text-paper/60">
            Assisted access matters
          </p>
          <h2 className="mt-2 max-w-2xl font-display text-3xl">
            An artisan should not need to become an e-commerce operator.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-paper/75">
            WeaveLink is planning voice guidance, reviewed translations, and a
            facilitator workflow so artisans retain control over identity, price,
            capacity, and consent while receiving practical local assistance.
          </p>
          <Link
            href="/sell"
            className="mt-7 inline-flex rounded-full bg-paper px-5 py-2.5 text-sm font-medium text-indigo"
          >
            Try the listing workflow
          </Link>
        </div>
      </section>
    </div>
  );
}
