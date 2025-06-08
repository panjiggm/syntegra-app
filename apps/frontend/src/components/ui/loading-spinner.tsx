// components/ui/loading-spinner.tsx
import * as React from "react";
import { Loader2 } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const spinnerVariants = cva("animate-spin", {
  variants: {
    size: {
      xs: "h-3 w-3",
      sm: "h-4 w-4",
      md: "h-6 w-6",
      lg: "h-8 w-8",
      xl: "h-12 w-12",
    },
    variant: {
      default: "text-primary",
      secondary: "text-secondary-foreground",
      muted: "text-muted-foreground",
      destructive: "text-destructive",
    },
  },
  defaultVariants: {
    size: "md",
    variant: "default",
  },
});

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  /**
   * Show text alongside spinner
   */
  text?: string;
  /**
   * Center the spinner in its container
   */
  centered?: boolean;
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size, variant, text, centered = false, ...props }, ref) => {
    const Comp = (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-2",
          centered && "justify-center",
          className
        )}
        {...props}
      >
        <Loader2 className={cn(spinnerVariants({ size, variant }))} />
        {text && (
          <span className="text-sm font-medium text-muted-foreground">
            {text}
          </span>
        )}
      </div>
    );

    if (centered) {
      return (
        <div className="flex items-center justify-center w-full h-full">
          {Comp}
        </div>
      );
    }

    return Comp;
  }
);

LoadingSpinner.displayName = "LoadingSpinner";

export { LoadingSpinner, spinnerVariants };
