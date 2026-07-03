import type { ComponentType, ReactNode } from "react";

export function ShowcaseSectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1aa39a]">
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
      className={`rounded-[2rem] border border-[#d8e4de] bg-white/92 p-6 shadow-[0_16px_48px_rgba(22,46,39,0.06)] ${className}`.trim()}
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
    <div className="rounded-[1.25rem] bg-[#f3f8f5] p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <div className="mt-2 text-sm leading-6 text-slate-700">{value}</div>
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
    <div className="rounded-[1.8rem] border border-[#d8e4de] bg-white/88 p-5 shadow-[0_16px_40px_rgba(22,46,39,0.05)]">
      <div className="flex items-center gap-3 text-[#17352a]">
        <Icon className="h-5 w-5" />
        <p className="text-sm font-semibold uppercase tracking-[0.16em]">{title}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
