import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

interface CollapsibleSectionProps {
  title: ReactNode;
  /** Rendered on the right of the header (e.g. subtotal + copy button). */
  right?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

/** Lightweight collapsible used for the DC → World result sections (SPEC §9). */
export function CollapsibleSection({
  title,
  right,
  defaultOpen = true,
  children,
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-xl border ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-2 py-1.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          aria-expanded={open}
        >
          <ChevronRight
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
          />
          <span className="min-w-0 truncate">{title}</span>
        </button>
        {right && <div className="flex shrink-0 items-center gap-1">{right}</div>}
      </div>
      {open && <div className="flex flex-col gap-2 p-2">{children}</div>}
    </div>
  );
}
