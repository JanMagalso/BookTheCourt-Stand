"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { createPublicSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

type BookTheCourtRegisterPageProps = {
  venueName: string;
};

export function BookTheCourtRegisterPage({
  venueName,
}: BookTheCourtRegisterPageProps) {
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setStatusMessage(
        "BookTheCourt registration is not available until Supabase auth is configured.",
      );
      return;
    }

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !contactNumber.trim() ||
      !email.trim() ||
      !password
    ) {
      setStatusMessage("Complete all required fields to create your account.");
      return;
    }

    if (password.length < 6) {
      setStatusMessage("Use a password with at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setStatusMessage("Your password confirmation does not match.");
      return;
    }

    setIsPending(true);
    setStatusMessage("");

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedContactNumber = contactNumber.trim();
    const trimmedEmail = email.trim();
    const fullName = `${trimmedFirstName} ${trimmedLastName}`.trim();

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          first_name: trimmedFirstName,
          last_name: trimmedLastName,
          contact_number: trimmedContactNumber,
          phone: trimmedContactNumber,
        },
      },
    });

    if (error || !data.user?.id) {
      setStatusMessage(
        error?.message || "We could not create your BookTheCourt account.",
      );
      setIsPending(false);
      return;
    }

    const profileResponse = await fetch("/api/auth/register-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: data.user.id,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        contactNumber: trimmedContactNumber,
      }),
    });

    if (!profileResponse.ok) {
      const profileResult = (await profileResponse.json().catch(() => null)) as
        | { error?: string }
        | null;
      setStatusMessage(
        profileResult?.error ||
          "We created the account, but could not finish the player profile yet.",
      );
      setIsPending(false);
      return;
    }

    if (data.session?.access_token) {
      router.replace(returnTo, { scroll: false });
      return;
    }

    setStatusMessage(
      "Your account was created. Check your email to verify it, then sign in.",
    );
    setIsPending(false);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-(--background) text-(--color-text-primary)">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(var(--color-shadow-brand-rgb),0.16),transparent_28%),linear-gradient(135deg,rgba(var(--color-surface-rgb),0.98),rgba(var(--color-surface-rgb),0.82))]" />
      <div className="absolute inset-0 opacity-60 [background-image:var(--gradient-hero-grid)] [background-position:center_center] [background-size:118px_118px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1680px] items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,560px)] lg:items-center">
          <section className="hidden lg:block">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-brand)">
                BookTheCourt Player Account
              </p>
              <h1 className="mt-5 text-5xl font-semibold leading-[0.94] tracking-[-0.06em] text-(--color-text-primary)">
                Create your account once, then book faster every time.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-(--color-text-secondary)">
                Save your player details, sign in before booking, and move
                through checkout without re-entering your information.
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
                    Ready for venue bookings
                  </p>
                  <p className="mt-1 text-sm leading-6 text-(--color-text-muted)">
                    Your new BookTheCourt account will work with the same login
                    flow used during reservation checkout.
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
                onClick={() => router.replace(returnTo, { scroll: false })}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-(--color-border-soft) px-4 py-2 text-sm font-semibold text-(--color-text-secondary) transition hover:border-(--color-brand) hover:text-(--color-brand)"
              >
                Back
              </button>
            </div>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-brand)">
                Create Account
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-(--color-text-primary)">
                Join BookTheCourt
              </h2>
              <p className="mt-3 text-sm leading-6 text-(--color-text-secondary)">
                Create your player account, then sign in from the venue page or
                continue straight back to your reservation flow.
              </p>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-(--color-text-secondary)">
                  First name
                  <input
                    type="text"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder="Juan"
                    className="h-12 rounded-xl border border-(--color-border-panel) bg-[rgba(var(--color-surface-rgb),0.82)] px-4 text-(--color-text-primary) outline-none transition placeholder:text-(--color-text-soft) focus:border-(--color-action-primary) focus:ring-2 focus:ring-(--color-action-info-soft)"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-(--color-text-secondary)">
                  Last name
                  <input
                    type="text"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder="Dela Cruz"
                    className="h-12 rounded-xl border border-(--color-border-panel) bg-[rgba(var(--color-surface-rgb),0.82)] px-4 text-(--color-text-primary) outline-none transition placeholder:text-(--color-text-soft) focus:border-(--color-action-primary) focus:ring-2 focus:ring-(--color-action-info-soft)"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-medium text-(--color-text-secondary)">
                Contact number
                <input
                  type="tel"
                  value={contactNumber}
                  onChange={(event) => setContactNumber(event.target.value)}
                  placeholder="09XX XXX XXXX"
                  className="h-12 rounded-xl border border-(--color-border-panel) bg-[rgba(var(--color-surface-rgb),0.82)] px-4 text-(--color-text-primary) outline-none transition placeholder:text-(--color-text-soft) focus:border-(--color-action-primary) focus:ring-2 focus:ring-(--color-action-info-soft)"
                />
              </label>

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

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-(--color-text-secondary)">
                  Password
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 6 characters"
                    className="h-12 rounded-xl border border-(--color-border-panel) bg-[rgba(var(--color-surface-rgb),0.82)] px-4 text-(--color-text-primary) outline-none transition placeholder:text-(--color-text-soft) focus:border-(--color-action-primary) focus:ring-2 focus:ring-(--color-action-info-soft)"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-(--color-text-secondary)">
                  Confirm password
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repeat your password"
                    className="h-12 rounded-xl border border-(--color-border-panel) bg-[rgba(var(--color-surface-rgb),0.82)] px-4 text-(--color-text-primary) outline-none transition placeholder:text-(--color-text-soft) focus:border-(--color-action-primary) focus:ring-2 focus:ring-(--color-action-info-soft)"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-(--color-brand-strong) px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(var(--color-shadow-brand-rgb),0.18)] transition hover:bg-(--color-brand-strong-hover) disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Creating account..." : "Create BookTheCourt Account"}
              </button>
            </form>

            {statusMessage ? (
              <div className="mt-4 rounded-[1rem] border border-(--color-border-light) bg-(--color-surface-soft) px-4 py-3 text-sm text-(--color-text-secondary)">
                {statusMessage}
              </div>
            ) : null}

            <div className="mt-6 rounded-[1.25rem] border border-(--color-border-light) bg-[rgba(var(--color-surface-rgb),0.62)] px-4 py-4 text-sm leading-6 text-(--color-text-muted)">
              Already have an account?{" "}
              <Link
                href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
                className="font-semibold text-(--color-brand) underline-offset-4 hover:underline"
              >
                Sign in here
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
