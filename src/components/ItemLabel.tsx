// Reusable item label (SPEC §9/§10): small icon + name, shared by the basket and the
// results panes. Hover shows a Tier-1 preview card (icon, name, marketable status, and —
// when known — the cheapest price + world). Right-click opens the FFXIV wiki. In the
// results pane, clicking copies the name for pasting into the market-board search.

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ItemIcon } from "@/components/ItemIcon";
import { openItemWiki } from "@/lib/wiki";
import { gil } from "@/lib/format";

interface ItemLabelProps {
  name: string;
  icon?: number;
  iconSize?: number;
  hq?: boolean;
  /** false → show "not on market board" in the hover card. */
  marketable?: boolean;
  /** What the user typed, if it differs from the resolved name (basket). */
  typed?: string;
  /** Cheapest price + world, shown in the hover card after Generate. */
  cheapest?: { pricePerUnit: number; worldName: string } | null;
  /** Results pane: clicking copies the name to the clipboard. */
  copyOnClick?: boolean;
  className?: string;
}

export function ItemLabel({
  name,
  icon,
  iconSize = 24,
  hq,
  marketable,
  typed,
  cheapest,
  copyOnClick,
  className,
}: ItemLabelProps) {
  const [copied, setCopied] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    if (!copyOnClick) return;
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(name);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    void openItemWiki(name);
  }

  const triggerClass = `group/itemlabel inline-flex min-w-0 items-center gap-1.5 text-left ${
    copyOnClick ? "hover:underline" : ""
  } ${className ?? ""}`;

  const inner = (
    <>
      <ItemIcon icon={icon} size={iconSize} />
      <span className="truncate">
        {name}
        {hq && <span className="ml-1 text-[#e8c170]">HQ</span>}
      </span>
      {copyOnClick &&
        (copied ? (
          <Check className="size-3 shrink-0 text-emerald-400" />
        ) : (
          <Copy className="size-3 shrink-0 opacity-0 transition-opacity group-hover/itemlabel:opacity-50" />
        ))}
    </>
  );

  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          copyOnClick ? (
            <button
              type="button"
              onClick={handleClick}
              onContextMenu={handleContextMenu}
              title="Click to copy · right-click for wiki"
              className={triggerClass}
            />
          ) : (
            <span onContextMenu={handleContextMenu} title="Right-click for wiki" className={triggerClass} />
          )
        }
      >
        {inner}
      </HoverCardTrigger>
      <HoverCardContent className="w-64">
        <div className="flex gap-2.5">
          <ItemIcon icon={icon} size={40} />
          <div className="min-w-0 flex-1">
            <div className="font-medium">{name}</div>
            <div className="text-xs text-muted-foreground">
              {marketable === false ? "Not on market board (vendor/quest)" : "Marketable"}
            </div>
            {typed && typed.toLowerCase() !== name.toLowerCase() && (
              <div className="truncate text-[11px] text-muted-foreground">you typed: {typed}</div>
            )}
            {cheapest && (
              <div className="mt-0.5 text-xs">
                Cheapest <span className="text-emerald-400">{gil(cheapest.pricePerUnit)}</span> ·{" "}
                {cheapest.worldName}
              </div>
            )}
          </div>
        </div>
        <div className="mt-2 border-t pt-1.5 text-[10px] text-muted-foreground">
          Right-click → View on FFXIV Wiki
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
