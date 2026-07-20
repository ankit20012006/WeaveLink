import Link from "next/link";
import { orders, products, weavers } from "@/data/mock";
import { formatINR } from "@/lib/utils";
import {
  IndianRupee,
  Package,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";

const statusStyles = {
  pending: "bg-warp-gold-soft text-ink",
  shipped: "bg-indigo-soft text-indigo-mid",
  settled: "bg-loom-soft text-loom",
} as const;

export default function DashboardPage() {
  const weaver = weavers[0];
  const inventory = products.filter((p) => p.weaverId === weaver.id);
  const pendingPayout = orders
    .filter((o) => o.status !== "settled")
    .reduce((sum, o) => sum + o.amount, 0);
  const monthGmv = orders.reduce((sum, o) => sum + o.amount, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
            Seller desk
          </p>
          <h1 className="mt-2 font-display text-4xl text-indigo">
            Namaste, {weaver.name.split(" ")[0]}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {weaver.cluster} · Cooperative multi-weaver ready · Demo balances
          </p>
        </div>
        <Link
          href="/sell"
          className="rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-paper"
        >
          New listing
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "This month GMV",
            value: formatINR(monthGmv),
            icon: TrendingUp,
          },
          {
            label: "Pending settlement",
            value: formatINR(pendingPayout),
            icon: IndianRupee,
          },
          {
            label: "Open orders",
            value: String(orders.filter((o) => o.status !== "settled").length),
            icon: ShoppingBag,
          },
          {
            label: "Active SKUs",
            value: String(inventory.length),
            icon: Package,
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
                {orders.map((order) => (
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
                        className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[order.status]}`}
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
            Settlements show transparent fee breakdown to UPI / bank (mocked).
            ONDC-ready seller node planned post-selection.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-indigo">Inventory</h2>
          <ul className="mt-4 space-y-3">
            {inventory.map((item) => (
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
