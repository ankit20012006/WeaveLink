"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

export function VerificationQr({ serial }: { serial: string }) {
  const [url, setUrl] = useState(`/verify/${serial}`);

  useEffect(() => {
    setUrl(`${window.location.origin}/verify/${encodeURIComponent(serial)}`);
  }, [serial]);

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
      <QRCodeSVG
        value={url}
        size={164}
        level="H"
        marginSize={2}
        title={`Verify product passport ${serial}`}
      />
      <p className="mt-3 max-w-[164px] break-all text-center font-mono text-[10px] text-muted">
        {url}
      </p>
    </div>
  );
}
