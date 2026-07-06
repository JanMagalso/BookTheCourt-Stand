"use client";

import { useState, useTransition } from "react";

import {
  formatCurrency,
  type Court,
  type SlotSelection,
  type Venue,
} from "@/lib/site-data";

type BookingIntakeFormProps = {
  courts: Court[];
  venue: Venue;
  selectedSlot: SlotSelection | null;
  onClose: () => void;
};

type FormState = {
  reservationName: string;
  fullName: string;
  contactNumber: string;
  playDate: string;
  courtId: string;
  startTime: string;
  durationHours: string;
  notes: string;
  acceptedTerms: boolean;
};

const initialState: FormState = {
  reservationName: "",
  fullName: "",
  contactNumber: "",
  playDate: "",
  courtId: "",
  startTime: "18:00",
  durationHours: "2",
  notes: "",
  acceptedTerms: false,
};

export function BookingIntakeForm({
  courts,
  venue,
  selectedSlot,
  onClose,
}: BookingIntakeFormProps) {
  const [formState, setFormState] = useState<FormState>(initialState);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedCourt =
    courts.find((court) => String(court.id) === selectedSlot?.courtId) ?? null;
  const durationHours = selectedSlot ? diffHours(selectedSlot.startTime, selectedSlot.endTime) : 1;
  const totalAmount = durationHours * venue.hourlyRate;

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/booking-requests", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formState,
            playDate: selectedSlot?.playDate ?? "",
            courtId: selectedSlot?.courtId ?? "",
            startTime: selectedSlot?.startTime ?? "",
            durationHours: String(durationHours),
          }),
        });

        const payload = (await response.json()) as { message?: string; error?: string };

        if (!response.ok) {
          setError(payload.error ?? "We could not save the booking request.");
          return;
        }

        onClose();
        setMessage(payload.message ?? "Booking request submitted.");
        setFormState(initialState);
      } catch {
        setError("Network error. Please try again after Supabase is configured.");
      }
    });
  }

  if (!selectedSlot) {
    return message || error ? (
      <section className="pb-10">
        <div className="rounded-2xl border border-slate-200 bg-[color:var(--color-surface)] px-6 py-4 shadow-[0_20px_80px_rgba(var(--color-shadow-rgb),0.08)]">
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        </div>
      </section>
    ) : null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] bg-[color:var(--color-surface)] shadow-[0_30px_120px_rgba(var(--color-shadow-rgb),0.35)]">
        <div className="flex items-start justify-between border-b border-[color:var(--color-border-warm)] px-6 py-5 md:px-10">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-[color:var(--color-danger-accent)]">
              Confirm Booking
            </p>
            <h3 className="mt-1 text-3xl font-semibold tracking-tight text-[color:var(--color-text-body-strong)]">
              Reserve your selected court time.
            </h3>
          </div>
          <button
            type="button"
            aria-label="Close confirmation modal"
            onClick={onClose}
            className="text-4xl leading-none text-[color:var(--color-text-disabled)] transition hover:text-[color:var(--color-text-body-strong)]"
          >
            ×
          </button>
        </div>

        <form className="space-y-6 px-6 py-6 md:px-10 md:py-8" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Reservation name
              <input
                required
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-cyan-500 focus:bg-white"
                value={formState.reservationName}
                onChange={(event) => updateField("reservationName", event.target.value)}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Full name
              <input
                required
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-cyan-500 focus:bg-white"
                value={formState.fullName}
                onChange={(event) => updateField("fullName", event.target.value)}
              />
            </label>
          </div>

          <div className="rounded-[1rem] border border-[color:var(--color-border-warning)] bg-[color:var(--color-surface-warm)] px-4 py-3 text-sm font-semibold text-[color:var(--color-text-body-muted)]">
            Select slots first from the availability board. This booking is tied to the exact court
            and time you clicked.
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Contact number
              <input
                required
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-cyan-500 focus:bg-white"
                value={formState.contactNumber}
                onChange={(event) => updateField("contactNumber", event.target.value)}
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Notes
            <textarea
              rows={4}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-cyan-500 focus:bg-white"
              value={formState.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="Team name, extra paddles, event setup, or payment reference"
            />
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            <input
              required
              type="checkbox"
              checked={formState.acceptedTerms}
              onChange={(event) => updateField("acceptedTerms", event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-700"
            />
            <span>
              I agree to the venue&apos;s no-cancellation and rescheduling terms. Bookings are
              confirmed only after payment verification.
            </span>
          </label>

          <div className="rounded-[1.5rem] border border-[color:var(--color-border-warning)] px-5 py-5 md:px-6">
            <p className="text-sm font-bold uppercase tracking-[0.04em] text-[color:var(--color-text-body-soft)]">
              Booking Summary
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-[color:var(--color-text-body-strong)]">
              {formatBookingDate(selectedSlot.playDate)}
            </p>

            <div className="mt-6 flex flex-col gap-5">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.04em] text-[color:var(--color-text-body-soft)]">
                  Selected Slot
                </p>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-2xl font-semibold text-[color:var(--color-text-body-strong)]">
                      {selectedCourt?.name ?? selectedSlot.courtName}
                    </p>
                    <p className="mt-1 text-3xl font-semibold text-[color:var(--color-danger-accent)]">
                      {formatTimeRange(selectedSlot.startTime, selectedSlot.endTime)}
                    </p>
                  </div>
                  <p className="text-2xl font-semibold text-[color:var(--color-text-body-strong)]">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
              </div>

              <div className="border-t border-[color:var(--color-border-warm)] pt-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-2xl font-semibold text-[color:var(--color-text-body-strong)]">Total Amount</p>
                  <p className="text-2xl font-semibold text-[color:var(--color-text-body-strong)]">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
              </div>

              <div className="grid gap-2 rounded-[1.25rem] bg-slate-50 px-4 py-4 text-sm text-slate-600 md:grid-cols-2">
                <p>Payment Method: {venue.paymentMethod}</p>
                <p>Schedule: {selectedSlot.timeLabel}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-[color:var(--color-border-warm)] pt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-[color:var(--color-button-warm)] px-10 py-4 text-lg font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[color:var(--color-button-warm-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Saving..." : "Next"}
            </button>
          </div>

          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        </form>
      </div>
    </div>
  );
}

function formatBookingDate(value: string) {
  if (!value) {
    return "Select a date";
  }

  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDisplayTime(value: string) {
  if (!value) {
    return "--";
  }

  const [hours, minutes] = value.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value;
  }

  const suffix = hours >= 12 ? "pm" : "am";
  const twelveHour = hours % 12 === 0 ? 12 : hours % 12;

  return `${twelveHour}:${minutes.toString().padStart(2, "0")}${suffix}`;
}

function formatTimeRange(start: string, end: string) {
  return `${formatDisplayTime(start)} - ${formatDisplayTime(end)}`;
}

function diffHours(start: string, end: string) {
  const [startHours, startMinutes] = start.split(":").map(Number);
  const [endHours, endMinutes] = end.split(":").map(Number);

  const startTotal = startHours * 60 + startMinutes;
  const endTotal = endHours * 60 + endMinutes;

  return Math.max(1, (endTotal - startTotal) / 60);
}
