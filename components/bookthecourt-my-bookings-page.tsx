"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { HeroNav } from "@/components/hero-nav";
import { createPublicSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

type BookTheCourtMyBookingsPageProps = {
  venueName: string;
};

type Reservation = {
  id: string;
  bookingReference: string;
  reservationName: string;
  venueName: string;
  startsAt: string;
  endsAt: string;
  status: string;
  holdExpiresAt: string | null;
  paymentReceiptUrl: string | null;
  courts: Array<{
    courtName: string;
    startsAt: string;
    endsAt: string;
  }>;
};

type ReservationApiRecord = Reservation & {
  courtName?: string;
};

type BookingStatusTab = "all" | "pending" | "booked" | "hold" | "cancelled";

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
  const [activeTab, setActiveTab] = useState<BookingStatusTab>("all");

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
          bookings?: ReservationApiRecord[];
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

        setReservations((result.bookings ?? []).map(normalizeReservation));
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

  const sortedReservations = [...reservations].sort(
    (left, right) =>
      new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime(),
  );
  const filteredReservations = sortedReservations.filter((reservation) =>
    matchesStatusTab(reservation.status, activeTab),
  );
  const activeTabCount = filteredReservations.length;

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
      <HeroNav
        venueName={venueName}
        sectionBasePath="/"
        solidOnLoad
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(var(--color-shadow-brand-rgb),0.16),transparent_28%),linear-gradient(135deg,rgba(var(--color-surface-rgb),0.98),rgba(var(--color-surface-rgb),0.82))]" />
      <div className="absolute inset-0 opacity-60 [background-image:var(--gradient-hero-grid)] [background-position:center_center] [background-size:118px_118px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1680px] px-4 pb-10 pt-28 sm:px-6 sm:pb-10 sm:pt-32 lg:px-10 lg:pt-36">
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
                title="Reservation Status"
                description="Switch tabs to quickly review pending, booked, on-hold, or cancelled reservations."
                bookings={filteredReservations}
                isLoading={isLoading}
                emptyMessage={`No ${getEmptyStateLabel(activeTab)} reservations were found for this account yet.`}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                counts={getReservationTabCounts(sortedReservations)}
                totalCount={activeTabCount}
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
  activeTab,
  onTabChange,
  counts,
  totalCount,
}: {
  title: string;
  description: string;
  bookings: Reservation[];
  isLoading: boolean;
  emptyMessage: string;
  activeTab: BookingStatusTab;
  onTabChange: (tab: BookingStatusTab) => void;
  counts: Record<BookingStatusTab, number>;
  totalCount: number;
}) {
  const tabs: Array<{ id: BookingStatusTab; label: string }> = [
    { id: "all", label: "All" },
    { id: "pending", label: "Pending" },
    { id: "booked", label: "Booked" },
    { id: "hold", label: "On Hold" },
    { id: "cancelled", label: "Cancelled" },
  ];

  return (
    <section className="rounded-[2rem] border border-(--color-border-card) bg-[rgba(var(--color-surface-rgb),0.86)] p-6 shadow-[0_28px_90px_rgba(var(--color-shadow-brand-rgb),0.16)] backdrop-blur-2xl sm:p-8">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-brand)">
          {title}
        </p>
        <p className="mt-2 text-sm leading-6 text-(--color-text-secondary)">
          {description}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "border-(--color-brand) bg-(--color-brand-strong) text-white"
                  : "border-(--color-border-soft) bg-[rgba(var(--color-surface-rgb),0.72)] text-(--color-text-secondary) hover:border-(--color-brand) hover:text-(--color-brand)"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  activeTab === tab.id
                    ? "bg-white/16 text-white"
                    : "bg-[rgba(var(--color-surface-rgb),0.82)] text-(--color-text-soft)"
                }`}
              >
                {counts[tab.id]}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm font-medium text-(--color-text-secondary)">
          {totalCount} {totalCount === 1 ? "reservation" : "reservations"} in{" "}
          {getTabLabel(activeTab)}.
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
                    {formatReservationTitle(booking.courts)}
                  </h3>
                  <p className="mt-1 text-sm text-(--color-text-secondary)">
                    {booking.venueName}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-(--color-text-secondary)">
                    Reserved under {booking.reservationName}
                  </p>
                  <div className="mt-4 grid gap-2">
                    {booking.courts.map((court) => (
                      <div
                        key={`${court.courtName}-${court.startsAt}-${court.endsAt}`}
                        className="rounded-[1rem] border border-(--color-border-card) bg-[rgba(var(--color-surface-rgb),0.52)] px-4 py-3"
                      >
                        <p className="text-sm font-semibold text-(--color-text-primary)">
                          {court.courtName}
                        </p>
                        <p className="mt-1 text-sm text-(--color-text-secondary)">
                          {formatDateLabel(court.startsAt)} ·{" "}
                          {formatTimeRange(court.startsAt, court.endsAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="min-w-0 rounded-[1.2rem] border border-(--color-border-card) bg-[rgba(var(--color-surface-rgb),0.72)] px-4 py-3 lg:min-w-[260px]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--color-text-soft)">
                    Booking Summary
                  </p>
                  <p className="mt-2 text-sm font-semibold text-(--color-text-primary)">
                    {formatDateLabel(booking.startsAt)}
                  </p>
                  <p className="mt-1 text-sm text-(--color-text-secondary)">
                    {formatTimeRange(booking.startsAt, booking.endsAt)}
                  </p>
                  <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-(--color-text-soft)">
                    {booking.courts.length} {booking.courts.length === 1 ? "court" : "courts"} in this booking
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

function formatReservationTitle(
  courts: Array<{ courtName: string; startsAt: string; endsAt: string }>,
) {
  const courtNames = Array.from(new Set(courts.map((court) => court.courtName)));

  if (courtNames.length <= 2) {
    return courtNames.join(" + ");
  }

  return `${courtNames.length} Courts`;
}

function normalizeReservation(reservation: ReservationApiRecord): Reservation {
  const normalizedCourts =
    Array.isArray(reservation.courts) && reservation.courts.length > 0
      ? reservation.courts
      : [
          {
            courtName: reservation.courtName?.trim() || "Court",
            startsAt: reservation.startsAt,
            endsAt: reservation.endsAt,
          },
        ];

  return {
    ...reservation,
    courts: normalizedCourts,
  };
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
  if (status === "cancelled") {
    return "border border-(--color-border-soft) bg-[rgba(var(--color-surface-rgb),0.72)] text-(--color-text-secondary)";
  }

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

function normalizeReservationStatus(status: string): Exclude<BookingStatusTab, "all"> {
  const normalized = status.trim().toLowerCase();

  if (normalized === "hold" || normalized === "on_hold") {
    return "hold";
  }

  if (normalized === "pending") {
    return "pending";
  }

  if (normalized === "booked" || normalized === "confirmed" || normalized === "reserved") {
    return "booked";
  }

  if (normalized === "cancelled") {
    return "cancelled";
  }

  return "booked";
}

function matchesStatusTab(status: string, tab: BookingStatusTab) {
  if (tab === "all") {
    return true;
  }

  return normalizeReservationStatus(status) === tab;
}

function getReservationTabCounts(reservations: Reservation[]) {
  return reservations.reduce<Record<BookingStatusTab, number>>(
    (counts, reservation) => {
      counts.all += 1;
      counts[normalizeReservationStatus(reservation.status)] += 1;
      return counts;
    },
    {
      all: 0,
      pending: 0,
      booked: 0,
      hold: 0,
      cancelled: 0,
    },
  );
}

function getTabLabel(tab: BookingStatusTab) {
  if (tab === "all") {
    return "All";
  }

  if (tab === "hold") {
    return "On Hold";
  }

  return tab.charAt(0).toUpperCase() + tab.slice(1);
}

function getEmptyStateLabel(tab: BookingStatusTab) {
  return tab === "all" ? "" : getTabLabel(tab).toLowerCase();
}
