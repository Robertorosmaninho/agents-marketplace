import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "badge-fast transition-colors",
  {
    variants: {
      variant: {
        default: "badge-fast-default",
        secondary: "badge-fast-secondary",
        outline: "badge-fast-outline",
        eyebrow: "badge-fast-eyebrow"
      }
    },
    defaultVariants: {
      variant: "outline"
    }
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}
