import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "l" | "m";

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
};

type ButtonAsButton = CommonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type ButtonAsLink = CommonProps & {
  href: string;
  type?: never;
  disabled?: boolean;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white shadow-[var(--shadow-1)] hover:bg-brand-strong hover:text-white hover:shadow-[var(--shadow-hover)] hover:-translate-y-0.5",
  secondary:
    "bg-surface text-brand-strong border-2 border-border-strong shadow-[var(--shadow-1)] hover:bg-lilac hover:shadow-[var(--shadow-hover)] hover:-translate-y-0.5",
  ghost:
    "bg-transparent text-ink-muted hover:bg-lilac/60 hover:text-ink",
  destructive:
    "bg-danger text-white shadow-[var(--shadow-1)] hover:text-white hover:brightness-95 hover:-translate-y-0.5",
};

const sizes: Record<ButtonSize, string> = {
  l: "min-h-14 px-7 text-lg",
  m: "min-h-11 px-5 text-base",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonAsButton | ButtonAsLink
>(function Button(
  { variant = "primary", size = "m", className, children, ...props },
  ref,
) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-pill font-bold transition-all duration-200 ease-out",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );

  if ("href" in props && props.href) {
    const { href, disabled, ...rest } = props;
    if (disabled) {
      return (
        <span className={cn(classes, "pointer-events-none opacity-50")} {...rest}>
          {children}
        </span>
      );
    }
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  const buttonProps = props as ButtonAsButton;
  return (
    <button ref={ref} className={classes} {...buttonProps}>
      {children}
    </button>
  );
});
