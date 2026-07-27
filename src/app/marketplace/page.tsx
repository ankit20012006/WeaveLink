"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { RefreshCw, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import {
  type Product,
  listCatalogCategories,
  listCatalogProducts,
  listClusters,
  listTechniques,
} from "@/lib/weavelink-api";

const FALLBACK_TEXT =
  "Could not load catalog from API. Please check backend connectivity.";
const BASE_FILTER_OPTIONS = ["All clusters", "All techniques", "All categories"];

export default function MarketplacePage() {
  const [query, setQuery] = useState("");
  const [cluster, setCluster] = useState("All clusters");
  const [technique, setTechnique] = useState("All techniques");
  const [category, setCategory] = useState("All categories");
  const [authOnly, setAuthOnly] = useState(true);
  const [sortBy, setSortBy] = useState<
    "featured" | "priceLowToHigh" | "priceHighToLow" | "nameAsc"
  >("featured");
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [clusters, setClusters] = useState<string[]>([BASE_FILTER_OPTIONS[0]]);
  const [techniques, setTechniques] = useState<string[]>([BASE_FILTER_OPTIONS[1]]);
  const [categories, setCategories] = useState<string[]>([BASE_FILTER_OPTIONS[2]]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isApiEnabled, setIsApiEnabled] = useState(true);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    if (cluster === "All clusters" || clusters.includes(cluster)) return;
    setCluster("All clusters");
  }, [cluster, clusters]);

  useEffect(() => {
    if (technique === "All techniques" || techniques.includes(technique))
      return;
    setTechnique("All techniques");
  }, [technique, techniques]);

  useEffect(() => {
    if (category === "All categories" || categories.includes(category))
      return;
    setCategory("All categories");
  }, [category, categories]);

  useEffect(() => {
    const parsedMin = Number.parseInt(minPriceInput, 10);
    const parsedMax = Number.parseInt(maxPriceInput, 10);

    if (!Number.isNaN(parsedMin) && parsedMin < 0) {
      setMinPriceInput("");
    }

    if (!Number.isNaN(parsedMax) && parsedMax < 0) {
      setMaxPriceInput("");
    }
  }, [minPriceInput, maxPriceInput]);

  const loadCatalog = useCallback(async () => {
    setIsCatalogLoading(true);
    const minPrice = Number.parseInt(minPriceInput, 10);
    const maxPrice = Number.parseInt(maxPriceInput, 10);

    try {
      const [catalogProducts, catalogClusters, catalogTechniques, catalogCategories] =
        await Promise.all([
          listCatalogProducts({
            search: query.trim(),
            cluster,
            technique,
            category,
            authenticatedOnly: authOnly,
            sortBy,
            minPrice: Number.isNaN(minPrice) ? null : minPrice,
            maxPrice: Number.isNaN(maxPrice) ? null : maxPrice,
          }),
          listClusters(),
          listTechniques(),
          listCatalogCategories(),
        ]);

      setProducts(catalogProducts);
      setClusters([BASE_FILTER_OPTIONS[0], ...catalogClusters]);
      setTechniques([BASE_FILTER_OPTIONS[1], ...catalogTechniques]);
      setCategories([BASE_FILTER_OPTIONS[2], ...catalogCategories]);
      setIsApiEnabled(true);
      setCatalogError(null);
      return;
    } catch {
      setProducts([]);
      setClusters([BASE_FILTER_OPTIONS[0]]);
      setTechniques([BASE_FILTER_OPTIONS[1]]);
      setCategories([BASE_FILTER_OPTIONS[2]]);
      setIsApiEnabled(false);
      setCatalogError(FALLBACK_TEXT);
    } finally {
      setIsCatalogLoading(false);
    }
  }, [authOnly, category, cluster, maxPriceInput, minPriceInput, query, sortBy, technique]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCatalog();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadCatalog]);

  const localFilteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const min = Number.parseInt(minPriceInput, 10);
    const max = Number.parseInt(maxPriceInput, 10);
    const hasMin = !Number.isNaN(min);
    const hasMax = !Number.isNaN(max);

    let next = products.filter((p) => {
      if (authOnly && !p.authenticated) return false;
      if (cluster !== "All clusters" && p.cluster !== cluster) return false;
      if (technique !== "All techniques" && p.technique !== technique)
        return false;
      if (category !== "All categories" && p.category !== category) return false;
      if (hasMin && p.price < min) return false;
      if (hasMax && p.price > max) return false;
      if (normalized.length === 0) return true;

      const searchableText = [
        p.title,
        p.cluster,
        p.gi ?? "",
        p.technique,
        p.materials,
        p.storyTitle,
        ...p.tags,
        p.category,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalized);
    });

    if (sortBy === "priceLowToHigh") {
      next = [...next].sort((a, b) => a.price - b.price);
    } else if (sortBy === "priceHighToLow") {
      next = [...next].sort((a, b) => b.price - a.price);
    } else if (sortBy === "nameAsc") {
      next = [...next].sort((a, b) =>
        a.title.localeCompare(b.title, "en", { sensitivity: "base" }),
      );
    }

    return next;
  }, [
    authOnly,
    category,
    cluster,
    maxPriceInput,
    minPriceInput,
    query,
    products,
    technique,
    sortBy,
  ]);

  const filtered = localFilteredProducts;
  const sourceText = isApiEnabled ? "Live API" : "API unavailable";
  const sourceTone = isApiEnabled
    ? "border-loom-soft bg-loom-soft text-loom"
    : "border-warp-gold/40 bg-warp-gold-soft text-warp-gold";

  const sourceNote = isApiEnabled
    ? "Catalog currently uses API-backed results."
    : "Catalog data is currently unavailable.";

  const clearFilters = () => {
    setQuery("");
    setCluster("All clusters");
    setTechnique("All techniques");
    setCategory("All categories");
    setAuthOnly(true);
    setMinPriceInput("");
    setMaxPriceInput("");
    setSortBy("featured");
    void loadCatalog();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
          B2C storefront
        </p>
        <h1 className="mt-2 font-display text-4xl text-indigo">
          Marketplace
        </h1>
        <p className="mt-3 text-muted">
          Filter by cluster, technique, and authenticity. Every listing below
          carries a Digital Product Passport in the full flow.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-paper p-4 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs ${sourceTone}`}
          >
            {sourceText}
          </span>
          <button
            type="button"
            onClick={() => void loadCatalog()}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-paper px-3 py-1.5 text-xs text-indigo hover:border-indigo"
            disabled={isCatalogLoading}
          >
            <RefreshCw size={12} className={isCatalogLoading ? "animate-spin" : ""} />
            {isCatalogLoading ? "Syncing..." : "Sync catalog"}
          </button>
        </div>
        {catalogError ? (
          <p className="w-full rounded-xl border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {catalogError}
          </p>
        ) : null}
        <p className="w-full text-xs text-muted sm:w-auto">{sourceNote}</p>
        <label className="flex-1 min-w-[180px]">
          <span className="mb-1 block text-xs text-muted">Search</span>
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, technique, motif..."
              className="w-full rounded-xl border border-[var(--line)] bg-mist px-3 py-2 pl-9 text-sm text-ink"
            />
          </div>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          <span>Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="min-w-[160px] rounded-xl border border-[var(--line)] bg-mist px-3 py-2 text-sm text-ink"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Cluster / GI
          <select
            value={cluster}
            onChange={(e) => setCluster(e.target.value)}
            className="min-w-[160px] rounded-xl border border-[var(--line)] bg-mist px-3 py-2 text-sm text-ink"
          >
            {clusters.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Technique
          <select
            value={technique}
            onChange={(e) => setTechnique(e.target.value)}
            className="min-w-[180px] rounded-xl border border-[var(--line)] bg-mist px-3 py-2 text-sm text-ink"
          >
            {techniques.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex-1 min-w-[120px]">
          <span className="mb-1 block text-xs text-muted">Price min (₹)</span>
          <input
            type="number"
            min="0"
            value={minPriceInput}
            onChange={(e) => setMinPriceInput(e.target.value)}
            placeholder="Any"
            className="w-full rounded-xl border border-[var(--line)] bg-mist px-3 py-2 text-sm text-ink"
          />
        </label>
        <label className="flex-1 min-w-[120px]">
          <span className="mb-1 block text-xs text-muted">Price max (₹)</span>
          <input
            type="number"
            min="0"
            value={maxPriceInput}
            onChange={(e) => setMaxPriceInput(e.target.value)}
            placeholder="Any"
            className="w-full rounded-xl border border-[var(--line)] bg-mist px-3 py-2 text-sm text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Sort
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="min-w-[180px] rounded-xl border border-[var(--line)] bg-mist px-3 py-2 text-sm text-ink"
          >
            <option value="featured">Featured</option>
            <option value="nameAsc">Name (A-Z)</option>
            <option value="priceLowToHigh">Price: Low to high</option>
            <option value="priceHighToLow">Price: High to low</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => setAuthOnly((v) => !v)}
          className={`mt-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
            authOnly
              ? "bg-loom-soft text-loom"
              : "bg-cotton text-muted"
          }`}
        >
          <ShieldCheck size={15} />
          Authenticated only
        </button>
        <button
          type="button"
          onClick={clearFilters}
          className="mt-auto inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-paper px-4 py-2 text-sm font-medium text-muted transition hover:text-indigo"
        >
          <SlidersHorizontal size={14} />
          Clear filters
        </button>
      </div>

      <p className="mt-6 flex justify-between text-sm text-muted">
        <span>
          Showing {filtered.length} piece{filtered.length === 1 ? "" : "s"}
        </span>
        {isCatalogLoading ? <span className="text-xs">Updating live...</span> : null}
      </p>

      {!filtered.length ? (
        <div className="mt-6 rounded-2xl border border-[var(--line)] bg-paper p-6">
          <p className="text-sm text-muted">
            No pieces match this filter set. Try loosening category, price, or
            search terms.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
