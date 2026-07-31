import { type Order, type Product, type Weaver } from "@/data/mock";
import { resolveAuthHeaders } from "@/lib/weave-session";

export type { Order, Product, Weaver };

export type VerificationPayload = {
  product: Product;
  weaver: Weaver;
  passportStatus: "valid" | "revoked";
  anchorHash: string;
  anchorChain: string;
  anchorProvider: string;
  anchorStatus: "not_minted" | "submitted" | "confirmed" | "failed";
  anchorTransactionHash?: string | null;
  anchorExplorerUrl?: string | null;
  anchorContractAddress?: string | null;
  anchorTokenId?: number | null;
  anchorContractExplorerUrl?: string | null;
  anchorTokenExplorerUrl?: string | null;
  anchorConfirmations: number;
};

export type PassportAnchor = {
  productId: string;
  status: "not_configured" | "submitted" | "confirmed" | "failed";
  recordHash: string;
  chainId: number;
  network: string;
  contractAddress: string;
  recipientAddress: string;
  signerAddress: string;
  tokenId?: number | null;
  tokenUri: string;
  transactionHash: string;
  explorerUrl: string;
  contractExplorerUrl: string;
  tokenExplorerUrl?: string | null;
  blockNumber?: number | null;
  confirmations: number;
  errorMessage?: string | null;
  submittedAt: string;
  confirmedAt?: string | null;
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
  contactEmail: string;
  deliveryPincode: string;
  requiredBy?: string | null;
  sampleRequired: boolean;
  acceptsHandmadeVariation: boolean;
  targetBudget?: number | null;
  clientRef?: string | null;
};

export type RFQRecord = {
  id: string;
  productId: string;
  productTitle: string;
  buyer: string;
  quantity: number;
  notes: string | null;
  contactEmail?: string | null;
  deliveryPincode?: string | null;
  requiredBy?: string | null;
  sampleRequired?: boolean;
  acceptsHandmadeVariation?: boolean;
  targetBudget?: number | null;
  estimatedTotal: number;
  status: "submitted" | "accepted" | "rejected";
  createdAt: string;
  quotedUnitPrice?: number | null;
  productionLeadDays?: number | null;
  expectedArtisanPayout?: number | null;
  sellerNotes?: string | null;
  quoteValidUntil?: string | null;
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

function normalizeApiBase(raw: string): string {
  const value = raw.trim().replace(/\/+$/, "");
  const hasApiPrefix = (urlPath: string) =>
    /(^|\/)api\/v1(\/|$)/.test(urlPath);

  if (!value) {
    return FALLBACK_API_URL;
  }

  if (value.includes("://")) {
    const parsed = new URL(value);
    const path = parsed.pathname || "/";
    if (!hasApiPrefix(path)) {
      parsed.pathname = `${path.replace(/\/+$/, "")}/api/v1`;
    }

    return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
  }

  if (hasApiPrefix(value)) {
    return value.replace(/\/+$/, "");
  }

  return `${value}/api/v1`;
}

const CLEAN_API_URL = normalizeApiBase(API_BASE_URL);

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
  evidenceUrl?: string | null;
  originalAudioUrl?: string | null;
  story: string;
  storyTitle: string;
  tags?: string[];
  productionRange: string;
};

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = await resolveAuthHeaders(init.headers);

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

export type AuthMePayload = {
  user: Record<string, unknown>;
  roles: string[];
  profile: {
    weaverId?: string;
    [key: string]: unknown;
  } | null;
};

export type CheckoutPayload = {
  amount: number;
  currency?: string;
  purpose: string;
  notes?: Record<string, string>;
  weaverId?: string;
};

export type CheckoutSession = {
  status: "ready" | "not_configured" | "error";
  orderId?: string;
  orderNumber?: string;
  amount: number;
  currency: string;
  keyId?: string;
  message?: string;
};

export async function getMe(): Promise<AuthMePayload | null> {
  try {
    return await requestJson<AuthMePayload>("/auth/me");
  } catch {
    return null;
  }
}

export async function getSellerOrders(weaverId: string): Promise<Order[]> {
  return requestJson<Order[]>(`/catalog/seller/${encodeURIComponent(weaverId)}/orders`);
}

export async function getMyOrders(): Promise<Order[]> {
  return requestJson<Order[]>("/catalog/me/orders");
}

export async function getSellerProducts(weaverId: string): Promise<Product[]> {
  return requestJson<Product[]>(
    `/catalog/seller/${encodeURIComponent(weaverId)}/products`,
  );
}

export async function getMyProducts(): Promise<Product[]> {
  return requestJson<Product[]>("/catalog/me/products");
}

export async function getSellerRFQs(weaverId: string): Promise<RFQRecord[]> {
  return requestJson<RFQRecord[]>(`/catalog/seller/${encodeURIComponent(weaverId)}/rfqs`);
}

export async function getMyRFQs(): Promise<RFQRecord[]> {
  return requestJson<RFQRecord[]>("/catalog/me/rfqs");
}

export async function getSellerStats(weaverId: string): Promise<DashboardStats> {
  return requestJson<DashboardStats>(
    `/catalog/seller/${encodeURIComponent(weaverId)}/stats`,
  );
}

export async function getMyStats(): Promise<DashboardStats> {
  return requestJson<DashboardStats>("/catalog/me/stats");
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

export async function getProductPassport(
  productId: string,
): Promise<PassportAnchor | null> {
  return requestJson<PassportAnchor | null>(
    `/catalog/products/${encodeURIComponent(productId)}/passport`,
  );
}

export async function mintProductPassport(
  productId: string,
  recipientAddress?: string,
): Promise<PassportAnchor> {
  return requestJson<PassportAnchor>(
    `/catalog/products/${encodeURIComponent(productId)}/passport/mint`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipientAddress: recipientAddress?.trim() || null,
      }),
    },
  );
}

export async function verifyProductClaim(
  productId: string,
  payload: {
    status:
      | "evidence_submitted"
      | "cooperative_verified"
      | "gi_authority_verified"
      | "revoked";
    issuer: string;
    issuerRole: string;
    evidenceUrl: string;
    verificationMethod: string;
    expiresAt?: string | null;
  },
): Promise<Product> {
  return requestJson<Product>(
    `/catalog/products/${encodeURIComponent(productId)}/claim`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
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
  );
}

export async function createCheckoutSession(
  payload: CheckoutPayload,
): Promise<CheckoutSession> {
  return requestJson<CheckoutSession>("/catalog/payments/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
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
