import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface PasteBoxProps {
  disabled?: boolean;
  onAdd: (text: string) => void;
}

/** Paste textarea + "Parse & add" (SPEC §6 / §9 left pane). */
export function PasteBox({ disabled, onAdd }: PasteBoxProps) {
  const [text, setText] = useState("");
  const canAdd = !disabled && text.trim().length > 0;

  function handleAdd() {
    if (!canAdd) return;
    onAdd(text);
    setText("");
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        placeholder={"Paste a list, one item per line:\nTatami Mat: 8\nGlade Wall Chimney x2\n3 x Riviera Round Table"}
        className="h-28 resize-none font-mono text-xs"
        // Ctrl/Cmd+Enter to add
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleAdd();
        }}
      />
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          Formats: <code>Name: qty</code>, <code>Name xN</code>, <code>N x Name</code>, tabs
        </span>
        <Button size="sm" onClick={handleAdd} disabled={!canAdd}>
          Parse &amp; add
        </Button>
      </div>
    </div>
  );
}
