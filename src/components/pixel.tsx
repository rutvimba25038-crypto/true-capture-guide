import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PixelPanel({
  className,
  children,
  large,
  ...props
}: HTMLAttributes<HTMLDivElement> & { large?: boolean }) {
  return (
    <div
      className={cn(large ? "pixel-panel-lg" : "pixel-panel", "p-5", className)}
      {...props}
    >
      {children}
    </div>
  );
}

type PixelButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "dark";
  size?: "sm" | "md" | "lg";
};

export function PixelButton({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: PixelButtonProps) {
  return (
    <button
      className={cn(
        "pixel-press inline-flex items-center justify-center gap-2 border-3 border-foreground font-display uppercase tracking-tight",
        "shadow-[4px_4px_0_0_var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "px-3 py-2 text-[10px]",
        size === "md" && "px-5 py-3 text-xs",
        size === "lg" && "px-7 py-4 text-sm",
        variant === "primary" && "bg-primary text-primary-foreground",
        variant === "ghost" && "bg-card text-foreground",
        variant === "dark" && "bg-foreground text-background",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function PixelStrip({ className }: { className?: string }) {
  return <div className={cn("pixel-strip", className)} aria-hidden="true" />;
}

export function PixelTag({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "live" | "muted" | "warn";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border-2 border-foreground px-2 py-1 font-display text-[9px] uppercase",
        tone === "live" && "bg-pixel-green text-foreground",
        tone === "muted" && "bg-muted text-muted-foreground",
        tone === "warn" && "bg-primary text-primary-foreground",
      )}
    >
      {children}
    </span>
  );
}
