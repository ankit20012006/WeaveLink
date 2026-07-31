"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Mic,
  QrCode,
  ShoppingBag,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { WarpThreads } from "@/components/WarpThreads";
import { ProductCard } from "@/components/ProductCard";
import { useLanguage } from "@/lib/language";
import { listCatalogProducts, type Product } from "@/lib/weavelink-api";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.1 * i,
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

const FALLBACK_PRODUCT_COUNT = 3;

export default function HomePage() {
  const { t } = useLanguage();
  const mountedRef = useRef(false);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [isLive, setIsLive] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadFeatured = useCallback(async () => {
    setIsLoading(true);
    try {
      const catalogProducts = await listCatalogProducts({
        sortBy: "featured",
      });

      if (!mountedRef.current) {
        return;
      }
      setFeatured(catalogProducts.slice(0, FALLBACK_PRODUCT_COUNT));
      setIsLive(true);
    } catch {
      if (!mountedRef.current) {
        return;
      }
      setFeatured([]);
      setIsLive(false);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadFeatured();
  }, [loadFeatured]);

  const sourceText = isLive
    ? "Live API"
    : isLive === false
      ? "API unavailable"
      : "Checking API";
  const sourceTone = isLive
    ? "border-loom-soft bg-loom-soft text-loom"
    : isLive === false
      ? "border-warp-gold/40 bg-warp-gold-soft text-warp-gold"
      : "border-warp-gold/40 bg-warp-gold-soft text-warp-gold";

  const handleRefresh = () => {
    void loadFeatured();
  };

  return (
    <>
      <section className="relative min-h-[min(92vh,820px)] overflow-hidden grain">
        <Image
          src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1800&q=85"
          alt=""
          fill
          priority
          className="object-cover object-[center_35%]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#f3f5f8]/97 via-[#f3f5f8]/82 to-[#f3f5f8]/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#f3f5f8] via-transparent to-[#f3f5f8]/40" />
        <WarpThreads className="opacity-60" />

        <div className="relative mx-auto flex min-h-[min(92vh,820px)] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 lg:pb-20">
          <motion.p
            custom={0}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="font-display text-6xl leading-[0.92] tracking-tight text-indigo sm:text-7xl lg:text-8xl"
          >
            WeaveLink
          </motion.p>
          <motion.h1
            custom={1}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="mt-5 max-w-xl text-xl leading-snug text-ink sm:text-2xl"
          >
            {t("home.heroTitle")}
          </motion.h1>
          <motion.p
            custom={2}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="mt-3 max-w-md text-base leading-relaxed text-muted"
          >
            {t("home.heroBody")}
          </motion.p>
          <motion.div
            custom={3}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 rounded-full bg-indigo px-5 py-3 text-sm font-medium text-paper transition hover:bg-indigo-mid"
            >
              {t("home.browse")}
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/sell"
              className="inline-flex items-center gap-2 rounded-full border border-indigo/20 bg-paper/80 px-5 py-3 text-sm font-medium text-indigo backdrop-blur-sm transition hover:border-indigo/40"
            >
              <Mic size={16} />
              {t("home.tryVoice")}
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
          {t("home.howLabel")}
        </p>
        <h2 className="mt-2 font-display text-3xl text-indigo sm:text-4xl">
          {t("home.howTitle")}
        </h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
          {[
            {
              icon: Mic,
              title: t("home.step1Title"),
              body: t("home.step1Body"),
              href: "/sell",
            },
            {
              icon: QrCode,
              title: t("home.step2Title"),
              body: t("home.step2Body"),
              href: "/verify/WL-KAN-2026-08421",
            },
            {
              icon: ShoppingBag,
              title: t("home.step3Title"),
              body: t("home.step3Body"),
              href: "/b2b",
            },
          ].map((step, i) => (
            <Link
              key={step.title}
              href={step.href}
              className="group border-t border-indigo/15 pt-5 transition hover:border-indigo/40"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-soft text-indigo">
                <step.icon size={16} />
              </span>
              <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-muted">
                {t("home.step")} {i + 1}
              </p>
              <h3 className="mt-1 font-display text-xl text-ink group-hover:text-indigo">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {step.body}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--line)] bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
                Marketplace preview
              </p>
              <h2 className="mt-2 font-display text-3xl text-indigo">
                Authenticated pieces, ready to show
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs ${sourceTone}`}
              >
                {sourceText}
              </span>
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex items-center rounded-full border border-[var(--line)] bg-paper px-3 py-1.5 text-xs font-medium text-indigo transition hover:border-indigo"
                disabled={isLoading}
              >
                Retry API fetch
              </button>
              <Link
                href="/marketplace"
                className="text-sm font-medium text-indigo hover:underline"
              >
                View all →
              </Link>
            </div>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          {isLive === false ? (
            <p className="mt-3 text-xs text-muted">
              API is currently unavailable. Please retry to refresh the catalog
              preview.
            </p>
          ) : null}
          {isLoading ? (
            <p className="mt-3 text-xs text-muted">Loading live catalog...</p>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-0 overflow-hidden rounded-[1.75rem] bg-indigo lg:grid-cols-2">
          <div className="p-8 sm:p-10 lg:p-12">
            <Sparkles className="text-warp-gold" size={22} />
            <h2 className="mt-4 font-display text-3xl leading-tight text-paper sm:text-4xl">
              {t("home.storiesTitle")}
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-paper/80">
              {t("home.storiesBody")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/product/p-sambal-indigo"
                className="rounded-full bg-paper px-5 py-2.5 text-sm font-medium text-indigo"
              >
                {t("home.readStory")}
              </Link>
              <Link
                href="/verify/WL-KAN-2026-08421"
                className="rounded-full border border-paper/30 px-5 py-2.5 text-sm font-medium text-paper"
              >
                {t("home.scanPassport")}
              </Link>
            </div>
          </div>
          <div className="relative min-h-[280px]">
            <Image
              src="https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1000&q=80"
              alt="Indigo dyed textile close-up"
              fill
              className="object-cover"
              sizes="(max-width:1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>
    </>
  );
}
