import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

interface DropdownFilterProps {
  value: string | null;
  onChange: (value: string | null) => void;
  options: string[];
  placeholder?: string;
}

export function DropdownFilter({ value, onChange, options, placeholder = "Filter..." }: DropdownFilterProps) {
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className="flex items-center gap-0.5">
      <Select value={value || ""} onValueChange={(val) => onChange(val || null)}>
        <SelectTrigger className="h-7 text-xs flex-1" data-testid="select-dropdown-filter">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0"
          onClick={handleClear}
          data-testid="button-clear-dropdown-filter"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
