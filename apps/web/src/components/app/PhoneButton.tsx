import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/* =========================================================================
   PhoneButton — the app's action recipe. Pill geometry, 44px minimum touch
   target at md, and an explicit on-photo variant so controls laid over
   photography stay legible in both themes.
   ========================================================================= */

const phoneButtonVariants = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold tracking-[-0.01em] transition-[background-color,color,box-shadow,transform,border-color] duration-200 ease-smooth active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-glow hover:bg-primary/92",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        outline: "border border-border bg-card text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        muted: "bg-muted text-muted-foreground hover:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground shadow-elegant hover:bg-destructive/90",
        admin: "bg-admin text-admin-foreground shadow-elegant hover:bg-admin/92",
        onPhoto:
          "border border-onimage-border bg-onimage-surface text-onimage backdrop-blur-md hover:bg-onimage-surface focus-visible:ring-onimage",
      },
      size: {
        sm: "h-9 rounded-full px-3.5 text-label [&_svg]:size-4",
        md: "h-11 rounded-full px-5 text-body [&_svg]:size-[18px]",
        lg: "h-12 rounded-full px-6 text-subhead [&_svg]:size-5",
        icon: "size-11 rounded-full [&_svg]:size-[19px]",
        iconSm: "size-9 rounded-full [&_svg]:size-[17px]",
        iconXs: "size-7 rounded-full [&_svg]:size-[15px]",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export interface PhoneButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof phoneButtonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const PhoneButton = React.forwardRef<HTMLButtonElement, PhoneButtonProps>(
  ({ className, variant, size, block, asChild = false, loading = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(phoneButtonVariants({ variant, size, block }), className)}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {children}
      </Comp>
    );
  },
);
PhoneButton.displayName = "PhoneButton";

/** Square-ish icon-only control (headers, photo viewer, close buttons). */
export const IconButton = React.forwardRef<HTMLButtonElement, PhoneButtonProps>(
  ({ variant = "ghost", size = "icon", ...props }, ref) => (
    <PhoneButton ref={ref} variant={variant} size={size} {...props} />
  ),
);
IconButton.displayName = "IconButton";

// eslint-disable-next-line react-refresh/only-export-components
export { phoneButtonVariants };
