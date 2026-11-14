import * as React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SelectOption = {
  value?: string;
  children?: React.ReactNode;
  disabled?: boolean;
};

const EMPTY_VALUE = "__select_field_empty__";

type SelectFieldProps = {
  value: string;
  onValueChange?: (value: string) => void;
  onChange?: (event: { target: { value: string } }) => void;
  className?: string;
  "aria-label"?: string;
  children: React.ReactNode;
};

/** A compact adapter for migrating native selects to the shadcn Select API. */
export function SelectField({
  value,
  onValueChange,
  onChange,
  className,
  children,
  ...props
}: SelectFieldProps) {
  const options = React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement<SelectOption>(child) || child.type !== "option") return [];
    return [child.props];
  });

  return (
    <Select
      value={value === "" ? EMPTY_VALUE : value}
      onValueChange={(nextValue) => {
        const normalizedValue = nextValue === EMPTY_VALUE ? "" : nextValue;
        onValueChange?.(normalizedValue);
        onChange?.({ target: { value: normalizedValue } });
      }}
    >
      <SelectTrigger className={cn("cursor-pointer", className)} {...props}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value === "" ? EMPTY_VALUE : (option.value ?? EMPTY_VALUE)}
            disabled={option.disabled}
          >
            {option.children}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
