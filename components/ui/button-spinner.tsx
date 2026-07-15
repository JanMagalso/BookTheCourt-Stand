type ButtonSpinnerProps = {
  className?: string;
};

export function ButtonSpinner({ className = "" }: ButtonSpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  );
}
