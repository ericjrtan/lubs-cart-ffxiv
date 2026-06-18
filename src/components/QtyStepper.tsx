import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface QtyStepperProps {
  value: number;
  onChange: (qty: number) => void;
  min?: number;
}

/** Small −/[input]/+ quantity control (SPEC §9 "quantity stepper"). */
export function QtyStepper({ value, onChange, min = 1 }: QtyStepperProps) {
  const clamp = (n: number) => Math.max(min, Math.floor(Number.isFinite(n) ? n : min));
  return (
    <div className="flex items-center">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="rounded-r-none"
        onClick={() => onChange(clamp(value - 1))}
        aria-label="Decrease quantity"
      >
        <Minus />
      </Button>
      <Input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(clamp(parseInt(e.target.value, 10)))}
        className="h-7 w-12 rounded-none border-x-0 px-1 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        aria-label="Quantity"
      />
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="rounded-l-none"
        onClick={() => onChange(clamp(value + 1))}
        aria-label="Increase quantity"
      >
        <Plus />
      </Button>
    </div>
  );
}
