import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CopyButtonProps {
  /** Resolved lazily so we only build the text on click. */
  getText: () => string;
  label?: string;
  title?: string;
}

/** Copies text to the clipboard with brief "Copied" feedback (SPEC §9 copy-list button). */
export function CopyButton({ getText, label = "Copy", title }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation(); // don't toggle a parent collapsible
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — ignore; the list is still on screen.
    }
  }

  return (
    <Button type="button" variant="ghost" size="xs" onClick={handleCopy} title={title ?? label}>
      {copied ? <Check className="text-emerald-400" /> : <Copy />}
      {copied ? "Copied" : label}
    </Button>
  );
}
