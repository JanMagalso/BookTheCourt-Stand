"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { createPublicSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

type BookTheCourtMyBookingsPageProps = {
  venueName: string;
};

type Reservation = {
  id: string;
  bookingReference: string;
  reservationName: string;
  courtName: string;
  venueName: string;
  startsAt: string;
  endsAt: string;
  status: string;
  holdExpiresAt: string | null;
  paymentReceiptUrl: string | null;
};

export function BookTheCourtMyBookingsPage({
  venueName,
}: BookTheCourtMyBookingsPageProps) {
  const isSupabaseConfigured = hasSupabaseEnv();
  const supabase = useMemo(
    () => (isSupabaseConfigured ? createPublicSupabaseClient() : null),
    [isSupabaseConfigured],
  );
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [statusMessage, setStatusMessage] = useState(
    isSupabaseConfigured
      ? ""
      : "BookTheCourt reservations are not available until Supabase auth is configured.",
  );
  const [currentTime] = useState(() => Date.now());

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    const syncReservations = async (accessToken?: string, email?: string | null) => {
      if (!isMounted) {
        return;
      }

      setSessionEmail(email ?? null);

      if (!accessToken) {
        setReservations([]);
        setStatusMessage("");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setStatusMessage("");

      try {
        const response = await fetch("/api/my-bookings", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const result = (await response.json()) as {
          error?: string;
          bookings?: Reservation[];
        };

        if (!response.ok) {
          if (!isMounted) {
            return;
          }

          setReservations([]);
          setStatusMessage(
            result.error ?? "We could not load your BookTheCourt reservations yet.",
          );
          setIsLoading(false);
          return;
        }

        if (!isMounted) {
          return;
        }

        setReservations(result.bookings ?? []);
        setStatusMessage("");
      } catch {
        if (!isMounted) {
          return;
        }

        setReservations([]);
        setStatusMessage("Network error. We could not load your reservations.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void supabase.auth.getSession().then(({ data }) => {
      void syncReservations(
        data.session?.access_token,
        data.session?.user?.email ?? null,
      );
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncReservations(
        session?.access_token,
        session?.user?.email ?? null,
      );
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const upcomingReservations = reservations.filter(
    (reservation) => new Date(reservation.endsAt).getTime() >= currentTime,
  );
  const pastReservations = reservations.filter(
    (reservation) => new Date(reservation.endsAt).getTime() < currentTime,
  );

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setReservations([]);
    setSessionEmail(null);
    setStatusMessage("Signed out successfully.");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-(--background) text-(--color-text-primary)">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(var(--color-shadow-brand-rgb),0.16),transparent_28%),linear-gradient(135deg,rgba(var(--color-surface-rgb),0.98),rgba(var(--color-surface-rgb),0.82))]" />
      <div className="absolute inset-0 opacity-60 [background-image:var(--gradient-hero-grid)] [background-position:center_center] [background-size:118px_118px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1680px] px-4 py-10 sm:px-6 lg:px-10">
        <div className="w-full">
          <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-brand)">
                BookTheCourt
              </p>
              <h1 className="mt-4 text-[2.5rem] font-semibold leading-[0.95] tracking-[-0.05em] text-(--color-text-primary) sm:text-[3.6rem]">
                My Bookings
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-(--color-text-secondary)">
                Sign in with your BookTheCourt account to review upcoming sessions,
                recently submitted payment proofs, and completed reservations for {venueName}.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-(--color-border-soft) px-5 py-2.5 text-sm font-semibold text-(--color-text-secondary) transition hover:border-(--color-brand) hover:text-(--color-brand)"
              >
                Back to venue
              </Link>
              {sessionEmail ? (
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-(--color-border-soft) px-5 py-2.5 text-sm font-semibold text-(--color-text-secondary) transition hover:border-(--color-brand) hover:text-(--color-brand)"
                >
                  Sign out
                </button>
              ) : (
                <Link
                  href="/login?returnTo=%2Fmy-bookings"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-(--color-brand-strong) px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-(--color-brand-strong-hover)"
                >
                  Login with BookTheCourt
                </Link>
              )}
            </div>
          </div>

          {!sessionEmail && !isLoading ? (
            <section className="rounded-[2rem] border border-(--color-border-card) bg-[rgba(var(--color-surface-rgb),0.86)] p-6 shadow-[0_28px_90px_rgba(var(--color-shadow-brand-rgb),0.16)] backdrop-blur-2xl sm:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-brand)">
                    Reservation Access
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-(--color-text-primary)">
                    View your bookings after you sign in
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-(--color-text-secondary)">
                    Use your BookTheCourt account to open your personal reservation list,
                    then jump back to reserve another session whenever you want.
                  </p>
                </div>

                <div className="flex items-center gap-4 rounded-[1.5rem] border border-(--color-border-card) bg-[rgba(var(--color-surface-rgb),0.72)] p-4 shadow-[0_18px_50px_rgba(var(--color-shadow-brand-rgb),0.1)] backdrop-blur-xl">
                  <Image
                    src="/brand/court-logo.png"
                    alt={venueName}
                    width={132}
                    height={92}
                    className="h-12 w-auto object-contain"
                  />
                  <Link
                    href="/login?returnTo=%2Fmy-bookings"
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-(--color-brand-strong) px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-(--color-brand-strong-hover)"
                  >
                    Open my bookings
                  </Link>
                </div>
              </div>
            </section>
          ) : (
            <div className="space-y-8">
              <section className="rounded-[2rem] border border-(--color-border-card) bg-[rgba(var(--color-surface-rgb),0.86)] p-6 shadow-[0_28px_90px_rgba(var(--color-shadow-brand-rgb),0.16)] backdrop-blur-2xl sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-brand)">
                      Signed In
                    </p>
                    <p className="mt-2 text-lg font-semibold text-(--color-text-primary)">
                      {sessionEmail ?? "Loading account..."}
                    </p>
                  </div>
                  <Link
                    href="/#book-now"
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-(--color-brand-accent) px-5 py-2.5 text-sm font-semibold text-(--color-brand-strong) transition hover:bg-(--color-brand-accent-hover)"
                  >
                    Reserve another session
                  </Link>
                </div>

                {statusMessage ? (
                  <p className="mt-4 text-sm font-medium text-(--color-danger-strong)">
                    {statusMessage}
                  </p>
                ) : null}
              </section>

              <BookingSection
                title="Upcoming Reservations"
                description="Sessions that are still active, pending, or upcoming."
                bookings={upcomingReservations}
                isLoading={isLoading}
                emptyMessage="You do not have any upcoming BookTheCourt reservations yet."
              />

              <BookingSection
                title="Past Reservations"
                description="Your earlier sessions stay here for quick reference."
                bookings={pastReservations}
                isLoading={isLoading}
                emptyMessage="No past reservations were found for this account yet."
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function BookingSection({
  title,
  description,
  bookings,
  isLoading,
  emptyMessage,
}: {
  title: string;
  description: string;
  bookings: Reservation[];
  isLoading: boolean;
  emptyMessage: string;
}) {
  return (
    <section className="rounded-[2rem] border border-(--color-border-card) bg-[rgba(var(--color-surface-rgb),0.86)] p-6 shadow-[0_28px_90px_rgba(var(--color-shadow-brand-rgb),0.16)] backdrop-blur-2xl sm:p-8">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-brand)">
          {title}
        </p>
        <p className="mt-2 text-sm leading-6 text-(--color-text-secondary)">
          {description}
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-[1.5rem] border border-(--color-border-card) bg-[rgba(var(--color-surface-rgb),0.68)] px-5 py-6 text-sm text-(--color-text-secondary)">
          Loading your reservations...
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-[1.5rem] border border-(--color-border-card) bg-[rgba(var(--color-surface-rgb),0.68)] px-5 py-6 text-sm text-(--color-text-secondary)">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <article
              key={booking.id}
              className="rounded-[1.6rem] border border-(--color-border-card) bg-[rgba(var(--color-surface-rgb),0.72)] p-5 shadow-[0_18px_50px_rgba(var(--color-shadow-brand-rgb),0.08)]"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${getStatusClasses(booking.status)}`}>
                      {getStatusLabel(booking.status)}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-(--color-text-soft)">
                      Ref {booking.bookingReference}
                    </span>
                  </div>

                  <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-(--color-text-primary)">
                    {booking.courtName}
                  </h3>
                  <p className="mt-1 text-sm text-(--color-text-secondary)">
                    {booking.venueName}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-(--color-text-secondary)">
                    Reserved under {booking.reservationName}
                  </p>
                </div>

                <div className="min-w-0 rounded-[1.2rem] border border-(--color-border-card) bg-[rgba(var(--color-surface-rgb),0.72)] px-4 py-3 lg:min-w-[260px]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--color-text-soft)">
                    Schedule
                  </p>
                  <p className="mt-2 text-sm font-semibold text-(--color-text-primary)">
                    {formatDateLabel(booking.startsAt)}
                  </p>
                  <p className="mt-1 text-sm text-(--color-text-secondary)">
                    {formatTimeRange(booking.startsAt, booking.endsAt)}
                  </p>
                  {booking.status === "hold" && booking.holdExpiresAt ? (
                    <p className="mt-2 text-xs font-medium text-(--color-warning)">
                      Hold expires {formatDateTimeLabel(booking.holdExpiresAt)}
                    </p>
                  ) : null}
                  {booking.paymentReceiptUrl ? (
                    <a
                      href={booking.paymentReceiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex text-sm font-semibold text-(--color-brand) transition hover:text-(--color-brand-strong)"
                    >
                      View uploaded payment proof
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

function formatDateTimeLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

function formatTimeRange(startValue: string, endValue: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  });

  return `${formatter.format(new Date(startValue))} - ${formatter.format(new Date(endValue))}`;
}

function getStatusLabel(status: string) {
  if (status === "hold") {
    return "On Hold";
  }

  if (status === "pending") {
    return "Pending";
  }

  if (status === "booked" || status === "confirmed" || status === "reserved") {
    return "Booked";
  }

  return status.replace(/_/g, " ");
}

function getStatusClasses(status: string) {
  if (status === "hold") {
    return "border border-(--color-brand-success-border) bg-(--color-surface-success-strong) text-(--color-brand-success-deep)";
  }

  if (status === "pending") {
    return "border border-(--color-border-warning-strong) bg-(--color-surface-warning) text-(--color-warning)";
  }

  if (status === "booked" || status === "confirmed" || status === "reserved") {
    return "border border-(--color-border-danger) bg-(--color-surface-danger) text-(--color-danger-strong)";
  }

  return "border border-(--color-border-soft) bg-[rgba(var(--color-surface-rgb),0.72)] text-(--color-text-secondary)";
}
