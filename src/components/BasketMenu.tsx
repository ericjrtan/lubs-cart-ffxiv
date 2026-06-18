// Save / load / delete named baskets (SPEC §9 save-load, §11 persistence).
// Uses a plain absolutely-positioned panel + transparent backdrop (same proven pattern as
// the autocomplete) rather than a portalled menu, so it can never trap focus or block.

import { useState } from "react";
import { ChevronDown, FolderOpen, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/state/SettingsProvider";
import { relativeTime } from "@/lib/time";
import type { BasketItem } from "@/hooks/useBasket";

interface BasketMenuProps {
  items: BasketItem[];
  onLoad: (items: BasketItem[]) => void;
}

export function BasketMenu({ items, onLoad }: BasketMenuProps) {
  const { savedBaskets, saveBasket, deleteBasket } = useSettings();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const existing = new Set(savedBaskets.map((b) => b.name));

  function save() {
    const trimmed = name.trim();
    if (!trimmed || items.length === 0) return;
    saveBasket(trimmed, items);
    setName("");
  }

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <FolderOpen className="size-3.5" />
        Baskets
        {savedBaskets.length > 0 && <span className="text-muted-foreground">({savedBaskets.length})</span>}
        <ChevronDown className="size-3.5" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border bg-popover p-2 text-popover-foreground shadow-md ring-1 ring-foreground/10">
            <div className="mb-1 text-xs font-medium text-muted-foreground">
              Save current basket ({items.length})
            </div>
            <div className="flex gap-1.5">
              <Input
                value={name}
                disabled={items.length === 0}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                placeholder={items.length === 0 ? "Basket is empty" : "Name this basket…"}
                className="h-7"
              />
              <Button size="sm" onClick={save} disabled={!name.trim() || items.length === 0}>
                <Save className="size-3.5" />
              </Button>
            </div>
            {name.trim() && existing.has(name.trim()) && (
              <p className="mt-1 text-[11px] text-amber-400">Overwrites "{name.trim()}".</p>
            )}

            <div className="my-2 h-px bg-border" />

            <div className="mb-1 text-xs font-medium text-muted-foreground">Saved baskets</div>
            {savedBaskets.length === 0 ? (
              <div className="px-1 py-1.5 text-xs text-muted-foreground">None saved yet</div>
            ) : (
              <div className="max-h-56 overflow-y-auto">
                {savedBaskets.map((b) => (
                  <div
                    key={b.name}
                    className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 hover:bg-accent"
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left text-sm"
                      onClick={() => {
                        onLoad(b.items);
                        setOpen(false);
                      }}
                    >
                      <span className="truncate">{b.name}</span>{" "}
                      <span className="text-[10px] text-muted-foreground">
                        ({b.items.length}) · {relativeTime(b.savedAt)}
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${b.name}`}
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => deleteBasket(b.name)}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
