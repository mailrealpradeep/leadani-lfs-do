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
  const handleClear = () => {
    onChange(null);
  };

  return (
    <div className="relative">
      <Select value={value || ""} onValueChange={(val) => onChange(val || null)}>
        <SelectTrigger className="h-7 text-xs" data-testid="select-dropdown-filter">
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
          className="h-5 w-5 absolute right-5 top-1/2 -translate-y-1/2 z-10"
          onClick={handleClear}
          data-testid="button-clear-dropdown-filter"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
