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
      className={`relative overflow-hidden rounded-[2rem] border border-(--color-border-card) bg-[linear-gradient(180deg,rgba(var(--color-surface-rgb),0.86),rgba(var(--color-surface-rgb),0.66))] p-6 shadow-[0_24px_72px_rgba(var(--color-shadow-brand-rgb),0.1)] backdrop-blur-2xl ${className}`.trim()}
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
    <div className="rounded-[1.25rem] border border-(--color-border-card) bg-[linear-gradient(180deg,rgba(var(--color-surface-rgb),0.86),rgba(var(--color-surface-rgb),0.68))] p-4 shadow-[0_14px_36px_rgba(var(--color-shadow-brand-rgb),0.06)] backdrop-blur-md">
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
      className={`rounded-[1.5rem] border border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.08))] px-5 py-4 text-white shadow-[0_18px_44px_rgba(0,0,0,0.12)] ring-1 ring-[rgba(255,255,255,0.12)] backdrop-blur-md lg:px-6 lg:py-5 ${className}`.trim()}
    >
      <p className="text-[11px] uppercase tracking-[0.18em] text-white/48">{label}</p>
      <p className="mt-2 text-3xl font-semibold lg:text-[2rem]">{value}</p>
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
    <div className="relative overflow-hidden rounded-[1.8rem] border border-(--color-border-card) bg-[linear-gradient(180deg,rgba(var(--color-surface-rgb),0.86),rgba(var(--color-surface-rgb),0.68))] p-5 shadow-[0_20px_54px_rgba(var(--color-shadow-brand-rgb),0.08)] backdrop-blur-xl">
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
