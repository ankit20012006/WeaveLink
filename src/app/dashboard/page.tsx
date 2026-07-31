"use client";

import { RefreshCw, Wallet } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatINR } from "@/lib/utils";
import { getStoredOrDefaultWeaverId } from "@/lib/weave-session";
import {
  getMe,
  getMyOrders,
  getMyProducts,
  getMyRFQs,
  getMyStats,
  getSellerOrders,
  getSellerProducts,
  getSellerRFQs,
  getSellerStats,
  type Product,
  type Order,
  type RFQRecord,
} from "@/lib/weavelink-api";
import {
  IndianRupee,
  Package,
  ShoppingBag,
  Tag,
  TrendingUp,
} from "lucide-react";
import { RFQInboxPanel } from "@/components/RFQInboxPanel";

type DashboardData = {
  monthGmv: number;
  pendingPayout: number;
  openOrders: number;
  openRfqs: number;
  products: Product[];
  orders: Order[];
  rfqs: RFQRecord[];
  isApiLive: boolean;
};

export default function DashboardPage() {
  const [state, setState] = useState<DashboardData>({
    monthGmv: 0,
    pendingPayout: 0,
    openOrders: 0,
    openRfqs: 0,
    products: [],
    orders: [],
    rfqs: [],
    isApiLive: false,
  });
  const [weaverId, setWeaverId] = useState<string>(
    getStoredOrDefaultWeaverId(),
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    setIsSyncing(true);

    const me = await getMe().catch(() => null);
    const mappedWeaverId =
      me?.profile?.weaverId && typeof me.profile.weaverId === "string"
        ? me.profile.weaverId
        : getStoredOrDefaultWeaverId();

    const hasMeScope = Boolean(me?.profile?.weaverId);
    setWeaverId(mappedWeaverId);

    const sellersCalls = hasMeScope
      ? ([
          getMyOrders(),
          getMyProducts(),
          getMyStats(),
          getMyRFQs(),
        ] as const)
      : ([
          getSellerOrders(mappedWeaverId),
          getSellerProducts(mappedWeaverId),
          getSellerStats(mappedWeaverId),
          getSellerRFQs(mappedWeaverId),
        ] as const);

    try {
      const [sellerOrdersResult, sellerProductsResult, statsResult, sellerRfqsResult] =
        await Promise.allSettled(sellersCalls);

      const sellerOrders = sellerOrdersResult.status === "fulfilled"
        ? sellerOrdersResult.value
        : [];
      const sellerProducts = sellerProductsResult.status === "fulfilled"
        ? sellerProductsResult.value
        : [];
      const stats =
        statsResult.status === "fulfilled"
          ? statsResult.value
          : {
              monthGmv: 0,
              pendingSettlement: 0,
              openOrders: 0,
              activeSkus: 0,
            };
      const sellerRfqs = sellerRfqsResult.status === "fulfilled"
        ? sellerRfqsResult.value
        : [];

      setState({
        orders: sellerOrders,
        products: sellerProducts,
        monthGmv: stats.monthGmv,
        pendingPayout: stats.pendingSettlement,
        openOrders: stats.openOrders,
        openRfqs: sellerRfqs.filter((rfq) => rfq.status === "submitted").length,
        rfqs: sellerRfqs,
        isApiLive:
          sellerOrdersResult.status === "fulfilled" ||
          sellerProductsResult.status === "fulfilled" ||
          sellerRfqsResult.status === "fulfilled" ||
          statsResult.status === "fulfilled",
      });
    } catch {
      setState({
        monthGmv: 0,
        pendingPayout: 0,
        openOrders: 0,
        openRfqs: 0,
        products: [],
        orders: [],
        rfqs: [],
        isApiLive: false,
      });
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const startSettlementCheckout = () => {
    setPaymentMessage(
      "Payout transfer is not enabled yet. Funds must follow a verified buyer payment, fulfilment milestone, and server-confirmed payout record.",
    );
  };

  const sourceText = state.isApiLive ? "Live API" : "API unavailable";
  const sourceTone = state.isApiLive
    ? "border-loom-soft bg-loom-soft text-loom"
    : "border-warp-gold/40 bg-warp-gold-soft text-warp-gold";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
            Seller desk
          </p>
          <h1 className="mt-2 font-display text-4xl text-indigo">
            Namaste
          </h1>
          <p className="mt-2 text-sm text-muted">
            Seller workspace · weaver id: {weaverId}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-paper px-4 py-2 text-sm font-medium text-indigo transition hover:border-indigo disabled:cursor-not-allowed disabled:opacity-70"
          >
            <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? "Syncing..." : "Sync dashboard"}
          </button>
          <button
            type="button"
            onClick={startSettlementCheckout}
            disabled={state.pendingPayout <= 0}
            className="inline-flex items-center gap-1.5 rounded-full bg-loom px-4 py-2 text-sm font-medium text-paper transition disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Wallet size={14} />
            Payout requirements
          </button>
          <Link
            href="/sell"
            className="rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-paper"
          >
            New listing
          </Link>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs ${sourceTone}`}
        >
          {sourceText}
        </span>
        {isSyncing ? (
          <p className="text-xs text-muted">Refreshing dashboard data from API…</p>
        ) : null}
      </div>
      {paymentMessage ? (
        <p className="mt-2 text-xs text-muted">{paymentMessage}</p>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          {
            label: "This month GMV",
            value: formatINR(state.monthGmv),
            icon: TrendingUp,
          },
          {
            label: "Pending settlement",
            value: formatINR(state.pendingPayout),
            icon: IndianRupee,
          },
          {
            label: "Open orders",
            value: String(state.openOrders),
            icon: ShoppingBag,
          },
          {
            label: "Active SKUs",
            value: String(state.products.length),
            icon: Package,
          },
          {
            label: "Open RFQs",
            value: String(state.openRfqs),
            icon: Tag,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-[var(--line)] bg-paper p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted">{stat.label}</p>
              <stat.icon size={16} className="text-indigo-mid" />
            </div>
            <p className="mt-2 font-display text-2xl text-ink">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section>
          <h2 className="font-display text-2xl text-indigo">Orders</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--line)] bg-paper">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--line)] bg-mist text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">
                    Buyer
                  </th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {state.orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-[var(--line)] last:border-0"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{order.id}</p>
                      <p className="text-xs text-muted">{order.productTitle}</p>
                      <p className="mt-0.5 text-[11px] text-muted sm:hidden">
                        {order.buyer} · {order.type}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <p>{order.buyer}</p>
                      <p className="text-xs text-muted">
                        {order.type} · {order.date}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatINR(order.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${orderStatusStyles[order.status]}`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">
            Settlement summaries show transparent fee visibility from connected seller records.
            ONDC-ready seller node planned post-selection.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-indigo">RFQ inbox</h2>
          <RFQInboxPanel initialRfqs={state.rfqs} />

          <h2 className="mt-6 font-display text-2xl text-indigo">Inventory</h2>
          <ul className="mt-4 space-y-3">
            {state.products.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-[var(--line)] bg-paper p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink">{item.title}</p>
                    <p className="mt-1 text-xs text-muted">{item.serial}</p>
                  </div>
                  <StatusPill status={item.status} />
                </div>
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/product/${item.id}`}
                    className="text-xs font-medium text-indigo hover:underline"
                  >
                    View
                  </Link>
                  <Link
                    href={`/verify/${item.serial}`}
                    className="text-xs font-medium text-loom hover:underline"
                  >
                    Passport
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function StatusPill({
  status,
}: {
  status: "available" | "in-production" | "sold";
}) {
  const map = {
    available: "bg-loom-soft text-loom",
    "in-production": "bg-warp-gold-soft text-ink",
    sold: "bg-cotton text-muted",
  };
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${map[status]}`}
    >
      {status.replace("-", " ")}
    </span>
  );
}

const orderStatusStyles = {
  pending: "bg-warp-gold-soft text-ink",
  shipped: "bg-indigo-soft text-indigo-mid",
  settled: "bg-loom-soft text-loom",
} as const;
