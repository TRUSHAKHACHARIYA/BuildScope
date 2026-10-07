import { useId, type ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FormFieldProps extends Omit<ComponentProps<typeof Input>, "id"> {
  label: string;
  error?: string;
}

/**
 * Labelled input with an error message. IDs are generated, so the same field name can appear in
 * several forms at once (Next keeps recently visited pages mounted in the background).
 */
export function FormField({ label, error, ...inputProps }: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
