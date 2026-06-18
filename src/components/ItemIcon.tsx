// Fixed-size item icon (SPEC §10). Loads the XIVAPI icon directly as a lazy <img>: the
// webview fetches them in parallel and caches them on disk natively (XIVAPI sends a
// 1-year Cache-Control), so a screen full of icons stays fast. Fades in over a neutral
// placeholder (no layout shift), and never blocks prices. Placeholder stays on error.

import { useState } from "react";
import { iconUrl } from "@/lib/icons";

interface ItemIconProps {
  icon?: number;
  size?: number;
  className?: string;
}

export function ItemIcon({ icon, size = 32, className }: ItemIconProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const url = iconUrl(icon);

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border ${className ?? ""}`}
      aria-hidden
    >
      {url && !failed && (
        <img
          src={url}
          alt=""
          loading="lazy"
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
