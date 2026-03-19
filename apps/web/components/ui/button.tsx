import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "btn-fast disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "btn-fast-primary",
        secondary: "btn-fast-muted",
        ghost: "btn-fast-ghost",
        outline: "btn-fast-secondary"
      },
      size: {
        default: "",
        sm: "btn-fast-sm",
        lg: "px-8 py-4",
        icon: "btn-fast-icon"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
