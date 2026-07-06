import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-[1.75rem] border border-white/65 bg-[rgba(var(--color-surface-rgb),0.52)] shadow-[0_24px_80px_rgba(var(--color-shadow-rgb),0.1)] backdrop-blur-2xl ${className}`.trim()}
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
      className={`text-xl font-semibold tracking-[-0.03em] text-[color:var(--color-text-primary)] ${className}`.trim()}
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
