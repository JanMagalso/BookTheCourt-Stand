import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: CardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[1.75rem] border border-(--color-border-card) bg-[linear-gradient(180deg,rgba(var(--color-surface-rgb),0.86),rgba(var(--color-surface-rgb),0.66))] shadow-[0_28px_90px_rgba(var(--color-shadow-rgb),0.1)] backdrop-blur-2xl ${className}`.trim()}
      {...props}
    />
  );
}

export function CardHeader({ className = "", ...props }: CardProps) {
  return <div className={`p-6 ${className}`.trim()} {...props} />;
}

export function CardTitle({ className = "", ...props }: CardProps) {
  return (
    <div
      className={`text-xl font-semibold tracking-[-0.03em] text-(--color-text-primary) ${className}`.trim()}
      {...props}
    />
  );
}

export function CardDescription({ className = "", ...props }: CardProps) {
  return (
    <div
      className={`text-sm leading-6 text-slate-600 ${className}`.trim()}
      {...props}
    />
  );
}

export function CardContent({ className = "", ...props }: CardProps) {
  return <div className={`px-6 pb-6 ${className}`.trim()} {...props} />;
}
