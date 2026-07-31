"use client";

import {
  Blocks,
  ExternalLink,
  LogIn,
  LogOut,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  getProductPassport,
  mintProductPassport,
  type PassportAnchor,
} from "@/lib/weavelink-api";
import {
  getSupabaseBrowserClient,
  isSupabaseBrowserConfigured,
} from "@/lib/supabase-browser";
import { getStoredAccessToken } from "@/lib/weave-session";

type PassportMintPanelProps = {
  productId: string;
  initialAnchor: PassportAnchor | null;
};

function shortHash(value: string): string {
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}

export function PassportMintPanel({
  productId,
  initialAnchor,
}: PassportMintPanelProps) {
  const [anchor, setAnchor] = useState(initialAnchor);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [authState, setAuthState] = useState<
    "loading" | "authenticated" | "unauthenticated" | "unconfigured"
  >("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthState(
        getStoredAccessToken() ? "authenticated" : "unconfigured",
      );
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      setAuthState(data.session ? "authenticated" : "unauthenticated");
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState(session ? "authenticated" : "unauthenticated");
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (anchor?.status !== "submitted") {
      return;
    }
    const interval = window.setInterval(() => {
      void getProductPassport(productId)
        .then((nextAnchor) => {
          if (nextAnchor) {
            setAnchor(nextAnchor);
            if (nextAnchor.status === "confirmed") {
              setMessage("Passport NFT confirmed on Sepolia.");
            }
          }
        })
        .catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(interval);
  }, [anchor?.status, productId]);

  const signIn = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Supabase browser authentication is not configured.");
      return;
    }
    setIsWorking(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setIsWorking(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setPassword("");
    setMessage("Verified seller session connected.");
  };

  const signOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setMessage("Seller session disconnected.");
  };

  const mint = async () => {
    setIsWorking(true);
    setMessage("");
    try {
      const nextAnchor = await mintProductPassport(
        productId,
        recipientAddress || undefined,
      );
      setAnchor(nextAnchor);
      setMessage(
        nextAnchor.status === "confirmed"
          ? "Passport NFT confirmed on Sepolia."
          : "Real Sepolia transaction submitted. Confirmation may take a moment.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Passport minting could not be started.",
      );
    } finally {
      setIsWorking(false);
    }
  };

  const refresh = async () => {
    setIsWorking(true);
    setMessage("");
    try {
      const nextAnchor = await getProductPassport(productId);
      setAnchor(nextAnchor);
      setMessage(
        nextAnchor?.status === "confirmed"
          ? "Passport NFT confirmed on Sepolia."
          : "Transaction is still waiting for confirmation.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not refresh blockchain status.",
      );
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <section className="mt-8 rounded-2xl border border-warp-gold/30 bg-warp-gold-soft p-5">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warp-gold text-paper">
          <Blocks size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.16em] text-warp-gold">
            Ethereum Sepolia
          </p>
          <h2 className="mt-1 font-display text-xl text-indigo">
            Artisan Passport NFT
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Timestamp the approved product record as an ERC-721 passport. The
            chain proves the record hash and time, while the verifier remains
            responsible for the physical claim.
          </p>

          {(!anchor || anchor.status === "failed") &&
          authState === "authenticated" ? (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-loom/20 bg-loom-soft px-3 py-2">
              <span className="text-xs font-medium text-loom">
                Verified seller session connected
              </span>
              {isSupabaseBrowserConfigured() ? (
                <button
                  type="button"
                  onClick={signOut}
                  className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
                >
                  <LogOut size={12} />
                  Sign out
                </button>
              ) : null}
            </div>
          ) : null}

          {(!anchor || anchor.status === "failed") &&
          authState === "unauthenticated" ? (
            <div className="mt-4 rounded-xl border border-[var(--line)] bg-paper/80 p-4">
              <p className="text-sm font-medium text-ink">
                Weaver sign-in required to mint
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Seller email"
                  autoComplete="email"
                  className="rounded-xl border border-[var(--line)] bg-paper px-3 py-2.5 text-sm text-ink"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  className="rounded-xl border border-[var(--line)] bg-paper px-3 py-2.5 text-sm text-ink"
                />
              </div>
              <button
                type="button"
                onClick={signIn}
                disabled={isWorking || !email.trim() || !password}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-indigo px-4 py-2 text-sm font-medium text-paper disabled:opacity-60"
              >
                {isWorking ? (
                  <LoaderCircle className="animate-spin" size={15} />
                ) : (
                  <LogIn size={15} />
                )}
                Sign in securely
              </button>
            </div>
          ) : null}

          {(!anchor || anchor.status === "failed") &&
          authState === "unconfigured" ? (
            <p className="mt-4 rounded-xl bg-paper/80 p-3 text-xs text-lac">
              Supabase browser authentication is not configured for this
              deployment.
            </p>
          ) : null}

          {anchor ? (
            <div className="mt-4 rounded-xl bg-paper/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-loom">
                  <ShieldCheck size={15} />
                  {anchor.status === "confirmed"
                    ? `Confirmed${anchor.tokenId ? ` · Token #${anchor.tokenId}` : ""}`
                    : anchor.status === "failed"
                      ? "Transaction failed"
                      : "Transaction submitted"}
                </span>
                <span className="font-mono text-xs text-muted">
                  {shortHash(anchor.transactionHash)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                <a
                  href={anchor.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo hover:underline"
                >
                  View real transaction
                  <ExternalLink size={13} />
                </a>
                <a
                  href={anchor.contractExplorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo hover:underline"
                >
                  Smart contract
                  <ExternalLink size={13} />
                </a>
                {anchor.tokenExplorerUrl ? (
                  <a
                    href={anchor.tokenExplorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo hover:underline"
                  >
                    NFT token #{anchor.tokenId}
                    <ExternalLink size={13} />
                  </a>
                ) : null}
                <a
                  href={anchor.tokenUri}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo hover:underline"
                >
                  Immutable metadata
                  <ExternalLink size={13} />
                </a>
                {anchor.status === "submitted" ? (
                  <button
                    type="button"
                    onClick={refresh}
                    disabled={isWorking}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo disabled:opacity-60"
                  >
                    <RefreshCw size={13} />
                    Refresh confirmation
                  </button>
                ) : null}
                {anchor.status === "failed" &&
                authState === "authenticated" ? (
                  <button
                    type="button"
                    onClick={mint}
                    disabled={isWorking}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-lac disabled:opacity-60"
                  >
                    <RefreshCw size={13} />
                    Retry mint
                  </button>
                ) : null}
              </div>
              {anchor.status === "confirmed" ? (
                <p className="mt-3 text-xs text-muted">
                  Block {anchor.blockNumber} · {anchor.confirmations} confirmation
                  {anchor.confirmations === 1 ? "" : "s"} · Chain {anchor.chainId}
                </p>
              ) : null}
            </div>
          ) : authState === "authenticated" ? (
            <div className="mt-4">
              <label className="block text-xs text-muted">
                Recipient wallet address
                <input
                  value={recipientAddress}
                  onChange={(event) => setRecipientAddress(event.target.value)}
                  placeholder="Optional — blank uses the managed demo wallet"
                  className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-paper px-3 py-2.5 font-mono text-xs text-ink"
                />
              </label>
              <button
                type="button"
                onClick={mint}
                disabled={isWorking}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-indigo px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-60"
              >
                {isWorking ? (
                  <LoaderCircle className="animate-spin" size={15} />
                ) : (
                  <Blocks size={15} />
                )}
                Mint passport NFT
              </button>
            </div>
          ) : null}

          {message ? (
            <p className="mt-3 break-words text-xs leading-relaxed text-muted">
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
