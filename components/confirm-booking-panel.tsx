"use client";

import { useEffect, useState } from "react";

import { ButtonSpinner } from "@/components/ui/button-spinner";
import { openConfirmBookingEvent } from "@/lib/confirm-booking-events";

type SearchMode = "receipt" | "email";

type LookupResult = {
  receiptId: string;
  venueName: string;
  venueLocation: string;
  status: string;
  bookings: Array<{
    id: string | number;
    reservationName: string;
    reservationEmail: string;
    courtName: string;
    startsAt: string;
    endsAt: string;
    createdAt: string | null;
    status: string;
  }>;
};

export function ConfirmBookingPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<SearchMode>("receipt");
  const [receiptId, setReceiptId] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [results, setResults] = useState<LookupResult[]>([]);

  useEffect(() => {
    const openPanel = () => {
      setErrorMessage("");
      setResults([]);
      setIsOpen(true);
    };

    window.addEventListener(openConfirmBookingEvent, openPanel);
    return () => window.removeEventListener(openConfirmBookingEvent, openPanel);
  }, []);

  async function handleLookup() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setResults([]);

    try {
      const response = await fetch("/api/bookings/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          ...(mode === "receipt" ? { receiptId } : {}),
          ...(mode === "email" ? { email, date: date || undefined } : {}),
        }),
      });
      const payload = (await response.json()) as {
        results?: LookupResult[];
        error?: string;
      };

      if (!response.ok) {
        setErrorMessage(payload.error ?? "Unable to find this reservation.");
        return;
      }

      setResults(payload.results ?? []);
      if (mode === "receipt" && payload.results?.[0]?.receiptId) {
        setReceiptId(payload.results[0].receiptId);
      }
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  const canSubmit =
    mode === "receipt"
      ? Boolean(receiptId.trim())
      : Boolean(email.trim());

  return (
    <div
      className="fixed inset-0 z-[1300] grid place-items-center overflow-y-auto bg-[rgba(5,20,31,0.62)] p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          setIsOpen(false);
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-booking-title"
        className="my-auto max-h-[90dvh] w-full max-w-[43rem] overflow-y-auto rounded-[1.75rem] border border-(--color-border-card) bg-(--color-surface) p-5 shadow-[0_32px_100px_rgba(var(--color-shadow-rgb),0.28)] sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="confirm-booking-title"
              className="text-xl font-semibold tracking-[-0.03em] text-(--color-text-primary) sm:text-2xl"
            >
              Check booking status
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-(--color-text-muted)">
              Search by booking number or email to see your reservation status.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close booking status panel"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-(--color-text-muted) transition hover:bg-(--color-surface-muted) hover:text-(--color-text-primary)"
          >
            ×
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Search by"
          className="mt-5 grid grid-cols-2 gap-1 rounded-full border border-(--color-border-panel) bg-(--color-surface-soft) p-1"
        >
          {(
            [
              { id: "receipt", label: "Booking no." },
              { id: "email", label: "Email" },
            ] as const
          ).map((tab) => {
            const isActive = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setMode(tab.id);
                  setErrorMessage("");
                  setResults([]);
                }}
                className={`rounded-full px-3 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "bg-(--color-brand) text-white shadow-sm"
                    : "text-(--color-text-muted) hover:text-(--color-text-primary)"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <form
          className="mt-5"
          onSubmit={(event) => {
            event.preventDefault();
            void handleLookup();
          }}
        >
          {mode === "receipt" ? (
            <>
              <label
                htmlFor="confirm-booking-receipt"
                className="text-[10px] font-bold uppercase tracking-[0.18em] text-(--color-text-muted)"
              >
                BTC booking number
              </label>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <div className="flex min-h-12 flex-1 overflow-hidden rounded-xl border border-(--color-border-panel) bg-(--color-surface-soft) focus-within:border-(--color-brand) focus-within:ring-2 focus-within:ring-[color:var(--color-action-info-soft)]">
                  <span className="inline-flex items-center border-r border-(--color-border-panel) px-4 font-mono text-sm font-semibold text-(--color-text-muted)">
                    BTC-
                  </span>
                  <input
                    id="confirm-booking-receipt"
                    value={receiptId.replace(/^BTC-?/i, "")}
                    onChange={(event) => {
                      setReceiptId(event.target.value);
                      setResults([]);
                      setErrorMessage("");
                    }}
                    placeholder="XXXXXXXX"
                    autoComplete="off"
                    className="min-w-0 flex-1 bg-transparent px-4 font-mono text-sm font-semibold tracking-[0.08em] text-(--color-text-primary) outline-none placeholder:text-(--color-text-soft)"
                  />
                </div>
                <SearchButton isSubmitting={isSubmitting} disabled={!canSubmit} />
              </div>
            </>
          ) : null}

          {mode === "email" ? (
            <>
              <label
                htmlFor="confirm-booking-email"
                className="text-[10px] font-bold uppercase tracking-[0.18em] text-(--color-text-muted)"
              >
                Reservation email
              </label>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <input
                  id="confirm-booking-email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setResults([]);
                    setErrorMessage("");
                  }}
                  placeholder="you@email.com"
                  autoComplete="email"
                  className="min-h-12 flex-1 rounded-xl border border-(--color-border-panel) bg-(--color-surface-soft) px-4 text-sm font-medium text-(--color-text-primary) outline-none placeholder:text-(--color-text-soft) focus:border-(--color-brand) focus:ring-2 focus:ring-[color:var(--color-action-info-soft)]"
                />
                <SearchButton isSubmitting={isSubmitting} disabled={!canSubmit} />
              </div>
              <label
                htmlFor="confirm-booking-date"
                className="mt-4 block text-[10px] font-bold uppercase tracking-[0.18em] text-(--color-text-muted)"
              >
                Play date <span className="font-medium normal-case tracking-normal">(optional filter)</span>
              </label>
              <input
                id="confirm-booking-date"
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  setResults([]);
                  setErrorMessage("");
                }}
                className="mt-2 min-h-12 w-full rounded-xl border border-(--color-border-panel) bg-(--color-surface-soft) px-4 text-sm font-medium text-(--color-text-primary) outline-none focus:border-(--color-brand) focus:ring-2 focus:ring-[color:var(--color-action-info-soft)] sm:max-w-64"
              />
            </>
          ) : null}
        </form>

        {errorMessage ? (
          <p className="mt-4 rounded-xl border border-(--color-border-danger) bg-(--color-surface-danger-soft) px-4 py-3 text-sm font-medium text-(--color-danger-strong)">
            {errorMessage}
          </p>
        ) : null}

        {results.length ? (
          <div className="mt-5 grid gap-4">
            {results.map((result) => {
              const firstBooking = result.bookings[0];
              if (!firstBooking) {
                return null;
              }

              return (
                <div
                  key={result.receiptId}
                  className="rounded-[1.5rem] border border-(--color-border-panel) bg-(--color-surface-soft) p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <DetailHeading
                      label="Booking number"
                      value={result.receiptId}
                    />
                    <StatusBadge status={result.status} />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <DetailCard
                      label="Booked by"
                      value={firstBooking.reservationName}
                    />
                    <DetailCard
                      label="Email"
                      value={firstBooking.reservationEmail || "Not provided"}
                    />
                    <DetailCard
                      label="Facility"
                      value={result.venueName}
                      secondary={result.venueLocation}
                    />
                    <DetailCard
                      label="Date of play"
                      value={formatBookingDate(firstBooking.startsAt)}
                    />
                    <DetailCard
                      label="Date booked"
                      value={
                        firstBooking.createdAt
                          ? formatBookingDate(firstBooking.createdAt, true)
                          : "Not available"
                      }
                    />
                    <DetailCard
                      label="Courts"
                      value={result.bookings
                        .map(
                          (booking) =>
                            `${booking.courtName} · ${formatBookingTime(booking.startsAt)}–${formatBookingTime(booking.endsAt)}`,
                        )
                        .join("\n")}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function SearchButton({
  isSubmitting,
  disabled,
}: {
  isSubmitting: boolean;
  disabled: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={isSubmitting || disabled}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-(--color-brand) px-6 text-sm font-semibold text-white transition hover:bg-(--color-brand-strong) disabled:cursor-wait disabled:opacity-60"
    >
      {isSubmitting ? <ButtonSpinner /> : <SearchIcon />}
      {isSubmitting ? "Searching..." : "Check status"}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isPending = status.toLowerCase().includes("pending");
  const isConfirmed = status.toLowerCase().includes("confirm");
  const isCancelled = status.toLowerCase().includes("cancel");

  const className = isConfirmed
    ? "border-(--color-brand-success-border) bg-(--color-surface-success) text-(--color-brand-success-deep)"
    : isCancelled
      ? "border-(--color-border-danger) bg-(--color-surface-danger-soft) text-(--color-danger-strong)"
      : isPending
        ? "border-(--color-brand-success-border) bg-(--color-surface-success) text-(--color-brand-success-deep)"
        : "border-(--color-border-soft) bg-(--color-surface) text-(--color-text-secondary)";

  return (
    <span
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${className}`}
    >
      {status}
    </span>
  );
}

function DetailHeading({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-(--color-text-muted)">
        {label}
      </p>
      <p className="mt-1.5 font-mono text-lg font-semibold text-(--color-text-primary)">
        {value}
      </p>
    </div>
  );
}

function DetailCard({
  label,
  value,
  secondary,
}: {
  label: string;
  value: string;
  secondary?: string;
}) {
  return (
    <div className="min-h-24 rounded-2xl border border-(--color-border-soft) bg-(--color-surface) px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-(--color-text-muted)">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6 text-(--color-text-primary)">
        {value}
      </p>
      {secondary ? (
        <p className="mt-1 text-xs text-(--color-text-muted)">{secondary}</p>
      ) : null}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function formatBookingDate(value: string, includeTime = false) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    weekday: includeTime ? undefined : "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(parsed);
}

function formatBookingTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}
