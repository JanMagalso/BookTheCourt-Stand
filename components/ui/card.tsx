import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-[1.75rem] border border-white/60 bg-white/88 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur ${className}`.trim()}
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
      className={`text-xl font-semibold tracking-[-0.03em] text-[#10233b] ${className}`.trim()}
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
