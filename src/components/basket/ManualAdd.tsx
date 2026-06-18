import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ItemIcon } from "@/components/ItemIcon";
import { QtyStepper } from "@/components/QtyStepper";
import type { ItemEntry, Resolver } from "@/lib/items";

interface ManualAddProps {
  resolver: Resolver | null;
  disabled?: boolean;
  onAdd: (entry: ItemEntry, qty: number, hqOnly: boolean) => void;
}

/** Name autocomplete + quantity stepper + HQ flag (SPEC §9 manual add row). */
export function ManualAdd({ resolver, disabled, onAdd }: ManualAddProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);
  const [hq, setHq] = useState(false);

  const results = useMemo(
    () => (resolver && open && query.trim() ? resolver.search(query, 8) : []),
    [resolver, open, query],
  );

  function add(entry: ItemEntry | undefined) {
    if (!entry) return;
    onAdd(entry, qty, hq);
    setQuery("");
    setQty(1);
    setHq(false);
    setOpen(false);
    setActive(0);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) {
      if (e.key === "Enter") add(resolver?.resolve(query).entry);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      add(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="flex items-start gap-2">
      <div className="relative flex-1">
        <Input
          value={query}
          disabled={disabled}
          placeholder={disabled ? "Loading items…" : "Add an item by name…"}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          className="h-8"
        />
        {open && results.length > 0 && (
          <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border bg-popover p-1 shadow-md">
            {results.map((entry, i) => (
              <li key={entry.id}>
                <button
                  type="button"
                  // onMouseDown fires before the input's onBlur, so the click registers.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    add(entry);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm ${
                    i === active ? "bg-accent text-accent-foreground" : ""
                  }`}
                >
                  <ItemIcon icon={entry.icon} size={20} />
                  <span className="flex-1 truncate">{entry.name}</span>
                  {!entry.marketable && (
                    <span className="text-[10px] text-amber-400/80">vendor</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <QtyStepper value={qty} onChange={setQty} />

      <div className="flex h-8 items-center gap-1.5">
        <Switch id="manual-hq" checked={hq} onCheckedChange={setHq} size="sm" />
        <Label htmlFor="manual-hq" className="text-xs text-muted-foreground">
          HQ
        </Label>
      </div>

      <Button
        size="sm"
        disabled={disabled || !query.trim()}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => add(results[active] ?? resolver?.resolve(query).entry)}
      >
        Add
      </Button>
    </div>
  );
}
