import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrCode({ value, size = 220 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: "#3a2a16", light: "#fbf6e6" },
    })
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch(() => setSrc(null));
    return () => {
      active = false;
    };
  }, [value, size]);

  return (
    <div
      className="border-3 border-foreground bg-card p-2"
      style={{ width: size + 20, height: size + 20 }}
    >
      {src ? (
        <img src={src} alt="Scan to join this game" width={size} height={size} />
      ) : (
        <div className="grid h-full w-full place-items-center font-display text-[9px] text-muted-foreground">
          QR
        </div>
      )}
    </div>
  );
}
