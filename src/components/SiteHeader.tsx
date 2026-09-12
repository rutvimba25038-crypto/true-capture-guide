import { Link } from "@tanstack/react-router";

export function SiteHeader({ label }: { label?: string }) {
  return (
    <header className="border-b-3 border-foreground bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid size-8 place-items-center border-3 border-foreground bg-primary font-display text-[11px]">
            T
          </span>
          <span className="font-display text-xs tracking-tight">TABLEQUEST</span>
        </Link>
        <div className="flex items-center gap-3 font-display text-[10px] uppercase">
          {label ? <span className="text-muted-foreground">{label}</span> : null}
          <Link
            to="/join"
            className="border-2 border-foreground bg-background px-2 py-1"
          >
            Join
          </Link>
          <Link
            to="/host"
            className="border-2 border-foreground bg-primary px-2 py-1"
          >
            Host
          </Link>
        </div>
      </div>
    </header>
  );
}
