import type { ComponentType, ReactNode } from "react";

export function ShowcaseSectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-brand-bright)]">
      {children}
    </p>
  );
}

export function ShowcaseInfoCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[2rem] border border-white/65 bg-[rgba(var(--color-surface-rgb),0.52)] p-6 shadow-[0_20px_56px_rgba(var(--color-shadow-brand-rgb),0.08)] backdrop-blur-2xl ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export function ShowcaseMiniCard({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-[1.25rem] border border-white/60 bg-[rgba(var(--color-surface-rgb),0.56)] p-4 backdrop-blur-md">
      <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--color-text-soft)]">
        {label}
      </p>
      <div className="mt-2 text-sm leading-6 text-[color:var(--color-text-secondary)]">
        {value}
      </div>
    </div>
  );
}

export function ShowcaseHeroStatCard({
  label,
  value,
  className = "",
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[1.5rem] border border-white/12 bg-white/10 px-5 py-4 text-white backdrop-blur-sm ${className}`.trim()}
    >
      <p className="text-[11px] uppercase tracking-[0.18em] text-white/48">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

export function ShowcaseFeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.8rem] border border-white/65 bg-[rgba(var(--color-surface-rgb),0.52)] p-5 shadow-[0_18px_48px_rgba(var(--color-shadow-brand-rgb),0.08)] backdrop-blur-xl">
      <div className="flex items-center gap-3 text-[color:var(--color-brand-strong)]">
        <Icon className="h-5 w-5" />
        <p className="text-sm font-semibold uppercase tracking-[0.16em]">{title}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-[color:var(--color-text-muted)]">
        {description}
      </p>
    </div>
  );
}
