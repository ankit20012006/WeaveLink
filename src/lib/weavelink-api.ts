import {
  clusters as fallbackClusterOptions,
  orders,
  products,
  techniques as fallbackTechniqueOptions,
  categories as fallbackCategoryOptions,
  type Order,
  type Product,
  type Weaver,
} from "@/data/mock";

export type VerificationPayload = {
  product: Product;
  weaver: Weaver;
  passportStatus: "valid" | "revoked";
  anchorHash: string;
  anchorChain: string;
  anchorProvider: string;
};

export type DashboardStats = {
  monthGmv: number;
  pendingSettlement: number;
  openOrders: number;
  activeSkus: number;
};

export type RFQPayload = {
  productId: string;
  buyer: string;
  quantity: number;
  notes?: string | null;
};

export type RFQRecord = {
  id: string;
  productId: string;
  productTitle: string;
  buyer: string;
  quantity: number;
  notes: string | null;
  estimatedTotal: number;
  status: "submitted" | "accepted" | "rejected";
  createdAt: string;
};

export type RFQUpdatePayload = {
  status: RFQRecord["status"];
};

export type ApiReadinessStatus = "ready" | "degraded" | "offline";

export type ApiReadiness = {
  status: ApiReadinessStatus;
  database: string;
  service?: string;
};

type CatalogFilters = {
  cluster?: string | null;
  technique?: string | null;
  category?: string | null;
  authenticatedOnly?: boolean;
  search?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  sortBy?: "featured" | "priceLowToHigh" | "priceHighToLow" | "nameAsc";
};

const FALLBACK_API_URL = "http://127.0.0.1:8000/api/v1";
const API_BASE_URL =
  process.env.NEXT_PUBLIC_WEAVELINK_API_URL?.trim() || FALLBACK_API_URL;
const CLEAN_API_URL = API_BASE_URL.endsWith("/")
  ? API_BASE_URL.slice(0, -1)
  : API_BASE_URL;

/** Demo seller used when Supabase auth is not configured (matches backend seed). */
export const DEMO_WEAVER_ID =
  process.env.NEXT_PUBLIC_WEAVELINK_DEMO_WEAVER_ID?.trim() || "w-lakshmi";

export type ProductCreatePayload = {
  title: string;
  price: number;
  bulkPrice: number;
  moq: number;
  category: string;
  technique: string;
  materials: string;
  loomType: string;
  cluster: string;
  gi?: string | null;
  status: Product["status"];
  authenticated?: boolean;
  serial: string;
  images?: string[];
  story: string;
  storyTitle: string;
  tags?: string[];
  productionRange: string;
};

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
  options: { demoWeaver?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };

  if (options.demoWeaver) {
    headers["X-Demo-Weaver-Id"] = DEMO_WEAVER_ID;
  }

  const response = await fetch(`${CLEAN_API_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const errorMessage = body || `${response.status} ${response.statusText}`;
    throw new Error(`WeaveLink API error (${response.status}): ${errorMessage}`);
  }

  return response.json() as Promise<T>;
}

export async function listCatalogProducts(
  filters: CatalogFilters = {},
): Promise<Product[]> {
  const params = new URLSearchParams();

  if (filters.cluster) {
    params.set("cluster", filters.cluster);
  }

  if (filters.technique) {
    params.set("technique", filters.technique);
  }

  if (filters.category) {
    params.set("category", filters.category);
  }

  if (filters.authenticatedOnly !== undefined) {
    params.set("authenticated_only", String(filters.authenticatedOnly));
  }

  if (filters.search) {
    params.set("search", filters.search);
  }

  if (filters.minPrice !== null && filters.minPrice !== undefined) {
    params.set("min_price", String(filters.minPrice));
  }

  if (filters.maxPrice !== null && filters.maxPrice !== undefined) {
    params.set("max_price", String(filters.maxPrice));
  }

  if (filters.sortBy) {
    const sortBy = {
      featured: "featured",
      priceLowToHigh: "price_low_to_high",
      priceHighToLow: "price_high_to_low",
      nameAsc: "name_asc",
    }[filters.sortBy];
    params.set("sort_by", sortBy);
  }

  const qs = params.toString();
  return requestJson<Product[]>(`/catalog/products${qs ? `?${qs}` : ""}`);
}

export async function getCatalogProduct(productId: string): Promise<Product> {
  return requestJson<Product>(`/catalog/products/${encodeURIComponent(productId)}`);
}

export async function verifyProductBySerial(serial: string): Promise<VerificationPayload> {
  return requestJson<VerificationPayload>(`/catalog/verify/${encodeURIComponent(serial)}`);
}

export async function listCatalogCategories(): Promise<string[]> {
  return requestJson<string[]>("/catalog/categories");
}

export async function listClusters(): Promise<string[]> {
  return requestJson<string[]>("/catalog/clusters");
}

export async function listTechniques(): Promise<string[]> {
  return requestJson<string[]>("/catalog/techniques");
}

export async function getSellerOrders(weaverId: string): Promise<Order[]> {
  return requestJson<Order[]>(`/catalog/seller/${encodeURIComponent(weaverId)}/orders`);
}

export async function getSellerProducts(weaverId: string): Promise<Product[]> {
  return requestJson<Product[]>(
    `/catalog/seller/${encodeURIComponent(weaverId)}/products`,
  );
}

export async function getSellerRFQs(weaverId: string): Promise<RFQRecord[]> {
  return requestJson<RFQRecord[]>(`/catalog/seller/${encodeURIComponent(weaverId)}/rfqs`);
}

export async function getSellerStats(weaverId: string): Promise<DashboardStats> {
  return requestJson<DashboardStats>(
    `/catalog/seller/${encodeURIComponent(weaverId)}/stats`,
  );
}

export async function getWeaver(weaverId: string): Promise<Weaver> {
  return requestJson<Weaver>(`/catalog/weavers/${encodeURIComponent(weaverId)}`);
}

export async function getSellerWeaver(weaverId: string): Promise<Weaver> {
  return getWeaver(weaverId);
}

export async function createRFQ(payload: RFQPayload): Promise<RFQRecord> {
  return requestJson<RFQRecord>("/catalog/rfq", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function updateRFQStatus(
  rfqId: string,
  status: RFQUpdatePayload["status"],
): Promise<RFQRecord> {
  return requestJson<RFQRecord>(
    `/catalog/rfq/${encodeURIComponent(rfqId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    },
    { demoWeaver: true },
  );
}

export async function createProduct(
  payload: ProductCreatePayload,
): Promise<Product> {
  return requestJson<Product>(
    "/catalog/products",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    { demoWeaver: true },
  );
}

export function getApiBaseUrl(): string {
  return CLEAN_API_URL;
}

export async function getApiReadiness(): Promise<ApiReadiness> {
  try {
    const result = await requestJson<ApiReadiness>("/ready");

    if (result.status === "ready" || result.status === "degraded") {
      return result;
    }

    return { status: "degraded", database: result.database, service: result.service };
  } catch {
    return { status: "offline", database: "disconnected" };
  }
}

export function fallbackCatalogProducts() {
  return products;
}

export function fallbackClusters() {
  return fallbackClusterOptions;
}

export function fallbackTechniques() {
  return fallbackTechniqueOptions;
}

export function fallbackCatalogCategories() {
  return fallbackCategoryOptions;
}

export function fallbackSellerOrders() {
  return orders;
}

export function fallbackSellerRfqs(): RFQRecord[] {
  return [];
}
