"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ButtonSpinner } from "@/components/ui/button-spinner";
import { createPublicSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

type BookTheCourtLoginPageProps = {
  venueName: string;
};

const reservationResumeStorageKey = "btc-reservation-resume";

export function BookTheCourtLoginPage({
  venueName,
}: BookTheCourtLoginPageProps) {
  const router = useRouter();
  const supabase = useMemo(
    () => (hasSupabaseEnv() ? createPublicSupabaseClient() : null),
    [],
  );
  const [returnTo] = useState(() => {
    if (typeof window === "undefined") {
      return "/";
    }

    const searchParams = new URLSearchParams(window.location.search);
    return sanitizeReturnPath(searchParams.get("returnTo"));
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [isSignOutPending, setIsSignOutPending] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      setSessionEmail(data.session?.user?.email ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      setSessionEmail(session?.user?.email ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setStatusMessage(
        "BookTheCourt login is not available until Supabase auth is configured.",
      );
      return;
    }

    if (!email.trim() || !password) {
      setStatusMessage("Enter your BookTheCourt email and password.");
      return;
    }

    setIsPending(true);
    setStatusMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.session?.access_token) {
      setStatusMessage(
        error?.message || "We could not sign you in with those credentials.",
      );
      setIsPending(false);
      return;
    }

    returnToReservation();
  }

  function returnToReservation() {
    if (isReturning) {
      return;
    }

    setIsReturning(true);
    router.replace(resolveReservationReturnPath(returnTo), { scroll: false });
  }

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    setIsSignOutPending(true);

    try {
      await supabase.auth.signOut();
      setSessionEmail(null);
      setStatusMessage("Signed out successfully.");
    } finally {
      setIsSignOutPending(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-(--background) text-(--color-text-primary)">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(var(--color-shadow-brand-rgb),0.16),transparent_28%),linear-gradient(135deg,rgba(var(--color-surface-rgb),0.98),rgba(var(--color-surface-rgb),0.82))]" />
      <div className="absolute inset-0 opacity-60 [background-image:var(--gradient-hero-grid)] [background-position:center_center] [background-size:118px_118px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1680px] items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,520px)] lg:items-center">
          <section className="hidden lg:block">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-brand)">
                BookTheCourt Access
              </p>
              <h1 className="mt-5 text-5xl font-semibold leading-[0.94] tracking-[-0.06em] text-(--color-text-primary)">
                Sign in, then jump straight back into your reservation.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-(--color-text-secondary)">
                Your selected court session stays ready. After login, we return
                you to the booking flow so you can continue without starting
                over.
              </p>

              <div className="mt-10 flex items-center gap-4 rounded-[1.75rem] border border-(--color-border-card) bg-[rgba(var(--color-surface-rgb),0.68)] p-5 shadow-[0_24px_70px_rgba(var(--color-shadow-brand-rgb),0.12)] backdrop-blur-2xl">
                <Image
                  src="/brand/court-logo.png"
                  alt={venueName}
                  width={180}
                  height={125}
                  className="h-16 w-auto shrink-0 object-contain"
                />
                <div>
                  <p className="text-sm font-semibold text-(--color-text-primary)">
                    Reservation-ready access
                  </p>
                  <p className="mt-1 text-sm leading-6 text-(--color-text-muted)">
                    Use your existing BookTheCourt credentials, then continue
                    with payment and confirmation from the venue booking flow.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-(--color-border-card) bg-[rgba(var(--color-surface-rgb),0.86)] p-5 shadow-[0_28px_90px_rgba(var(--color-shadow-brand-rgb),0.16)] backdrop-blur-2xl sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <Image
                src="/brand/court-logo.png"
                alt={venueName}
                width={132}
                height={92}
                className="h-12 w-auto object-contain sm:h-14"
              />
              <button
                type="button"
                onClick={returnToReservation}
                disabled={isReturning}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-(--color-border-soft) px-4 py-2 text-sm font-semibold text-(--color-text-secondary) transition hover:border-(--color-brand) hover:text-(--color-brand) disabled:cursor-wait disabled:opacity-60"
              >
                {isReturning ? <ButtonSpinner /> : null}
                {isReturning ? "Restoring..." : "Back to reservation"}
              </button>
            </div>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-brand)">
                Login
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-(--color-text-primary)">
                Continue with BookTheCourt
              </h2>
              <p className="mt-3 text-sm leading-6 text-(--color-text-secondary)">
                Sign in to use your BookTheCourt account for this reservation,
                or head back and continue as a guest.
              </p>
            </div>

            {sessionEmail ? (
              <div className="mt-6 rounded-[1.5rem] border border-(--color-border-light) bg-(--color-surface-soft) p-5">
                <p className="text-sm font-semibold text-(--color-text-primary)">
                  You are already signed in as {sessionEmail}.
                </p>
                <p className="mt-2 text-sm leading-6 text-(--color-text-muted)">
                  You can continue back to your saved reservation right away.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={returnToReservation}
                    disabled={isReturning || isSignOutPending}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-(--color-brand-strong) px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-(--color-brand-strong-hover) disabled:cursor-wait disabled:opacity-60"
                  >
                    {isReturning ? <ButtonSpinner /> : null}
                    {isReturning ? "Restoring..." : "Continue Reservation"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    disabled={isReturning || isSignOutPending}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-(--color-border-soft) px-5 py-2.5 text-sm font-semibold text-(--color-text-secondary) transition hover:border-(--color-brand) hover:text-(--color-brand) disabled:cursor-wait disabled:opacity-60"
                  >
                    {isSignOutPending ? <ButtonSpinner /> : null}
                    {isSignOutPending ? "Signing out..." : "Use another account"}
                  </button>
                </div>
              </div>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <label className="grid gap-2 text-sm font-medium text-(--color-text-secondary)">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@bookthecourt.com"
                    className="h-12 rounded-xl border border-(--color-border-panel) bg-[rgba(var(--color-surface-rgb),0.82)] px-4 text-(--color-text-primary) outline-none transition placeholder:text-(--color-text-soft) focus:border-(--color-action-primary) focus:ring-2 focus:ring-(--color-action-info-soft)"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-(--color-text-secondary)">
                  Password
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="h-12 rounded-xl border border-(--color-border-panel) bg-[rgba(var(--color-surface-rgb),0.82)] px-4 text-(--color-text-primary) outline-none transition placeholder:text-(--color-text-soft) focus:border-(--color-action-primary) focus:ring-2 focus:ring-(--color-action-info-soft)"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-(--color-brand-strong) px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(var(--color-shadow-brand-rgb),0.18)] transition hover:bg-(--color-brand-strong-hover) disabled:cursor-wait disabled:opacity-60"
                >
                  {isPending ? <ButtonSpinner /> : null}
                  {isPending ? "Signing in..." : "Sign In"}
                </button>
              </form>
            )}

            {statusMessage ? (
              <div className="mt-4 rounded-[1rem] border border-(--color-border-light) bg-(--color-surface-soft) px-4 py-3 text-sm text-(--color-text-secondary)">
                {statusMessage}
              </div>
            ) : null}

            <div className="mt-6 rounded-[1.25rem] border border-(--color-border-light) bg-[rgba(var(--color-surface-rgb),0.62)] px-4 py-4 text-sm leading-6 text-(--color-text-muted)">
              Guest booking is still available from the reservation modal if you
              don&apos;t want to sign in. Need a BookTheCourt account first?{" "}
              <Link
                href={`/register?returnTo=${encodeURIComponent(returnTo)}`}
                className="font-semibold text-(--color-brand) underline-offset-4 hover:underline"
              >
                Create one here
              </Link>
              .
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function sanitizeReturnPath(value: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/";
  }

  return value;
}

function resolveReservationReturnPath(returnTo: string) {
  if (returnTo !== "/" || typeof window === "undefined") {
    return returnTo;
  }

  return window.sessionStorage.getItem(reservationResumeStorageKey)
    ? "/?resumeReservation=1"
    : returnTo;
}
