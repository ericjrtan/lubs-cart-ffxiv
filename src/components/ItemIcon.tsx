// Fixed-size item icon (SPEC §10). Resolves the icon through the disk cache (falling back
// to the direct XIVAPI URL), then fades it in over a neutral placeholder so there's no
// layout shift and prices are never blocked. Placeholder stays on error / offline.

import { useEffect, useState } from "react";
import { getIconSrc } from "@/lib/iconCache";

interface ItemIconProps {
  icon?: number;
  size?: number;
  className?: string;
}

export function ItemIcon({ icon, size = 32, className }: ItemIconProps) {
  const [src, setSrc] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setSrc("");
    setLoaded(false);
    setFailed(false);
    if (!icon || icon <= 0) return;
    getIconSrc(icon)
      .then((s) => active && setSrc(s))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [icon]);

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border ${className ?? ""}`}
      aria-hidden
    >
      {src && !failed && (
        <img
          src={src}
          alt=""
          decoding="async"
          width={size}
          height={size}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`h-full w-full object-contain transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}
