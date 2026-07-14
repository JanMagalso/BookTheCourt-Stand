"use client";

import Image from "next/image";
import Link from "next/link";
import type { SVGProps } from "react";
import { useEffect, useMemo, useState } from "react";

import { createPublicSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

type HeroNavProps = {
  venueName: string;
  contactPhone?: string | null;
  sectionBasePath?: string;
  solidOnLoad?: boolean;
};

export function HeroNav({
  venueName,
  contactPhone,
  sectionBasePath = "",
  solidOnLoad = false,
}: HeroNavProps) {
  const isSupabaseConfigured = hasSupabaseEnv();
  const supabase = useMemo(
    () => (isSupabaseConfigured ? createPublicSupabaseClient() : null),
    [isSupabaseConfigured],
  );
  const [isScrolled, setIsScrolled] = useState(solidOnLoad);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loggedInFirstName, setLoggedInFirstName] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const syncScrollState = () => {
      setIsScrolled(solidOnLoad || window.scrollY > 18);
    };

    syncScrollState();
    window.addEventListener("scroll", syncScrollState, { passive: true });

    return () => window.removeEventListener("scroll", syncScrollState);
  }, [solidOnLoad]);

  useEffect(() => {
    const closeMenuOnResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    closeMenuOnResize();
    window.addEventListener("resize", closeMenuOnResize);

    return () => window.removeEventListener("resize", closeMenuOnResize);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const syncGreeting = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await syncAuthenticatedUserState(
        supabase,
        session?.user?.id ?? null,
        session?.user?.user_metadata,
        setIsAuthenticated,
        setLoggedInFirstName,
      );
    };

    void syncGreeting();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncAuthenticatedUserState(
        supabase,
        session?.user?.id ?? null,
        session?.user?.user_metadata,
        setIsAuthenticated,
        setLoggedInFirstName,
      );
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setIsMobileMenuOpen(false);
  }

  const mobilePanelClassName = isScrolled
    ? "border-t border-(--color-border-soft) bg-transparent text-(--color-text-secondary) shadow-none"
    : "border-t border-white/10 bg-transparent text-white/82 shadow-none backdrop-blur-0";

  const mobileChipClassName = isScrolled
    ? "rounded-xl px-3 py-3 text-(--color-text-secondary) hover:bg-[rgba(var(--color-surface-rgb),0.58)] hover:text-(--color-brand)"
    : "rounded-xl px-3 py-3 text-white/82 hover:bg-white/6 hover:text-white";
  const loginHref = "/login?returnTo=%2F";
  const registerHref = "/register?returnTo=%2F";
  const bookingsHref = isAuthenticated
    ? "/my-bookings"
    : "/login?returnTo=%2Fmy-bookings";
  const scheduleHref = `${sectionBasePath}#book-now`;
  const photosHref = `${sectionBasePath}#gallery`;
  const contactHref = `${sectionBasePath}#contact`;
  const detailsHref = `${sectionBasePath}#venue-info`;

  return (
    <>
      {isMobileMenuOpen ? (
        <button
          type="button"
          aria-label="Close menu overlay"
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-[1190] bg-[rgba(6,14,22,0.4)] backdrop-blur-[6px] lg:hidden"
        />
      ) : null}

      <header
        className={`fixed inset-x-0 top-0 z-[1200] transition-all duration-300 ${
          isScrolled
            ? "border-b border-(--color-border-soft) bg-[rgba(var(--color-surface-rgb),0.82)] shadow-[0_16px_40px_rgba(var(--color-shadow-rgb),0.16)] backdrop-blur-2xl"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="relative z-10 mx-auto w-full max-w-[1680px] px-4 py-3 sm:px-6 sm:py-4 lg:px-10">
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <Link href="/" className="flex min-w-0 items-center gap-2.5">
              <Image
                src="/brand/court-logo.png"
                alt={venueName}
                width={115}
                height={80}
                className="h-10 w-auto shrink-0"
              />
              <p
                className={`truncate text-sm font-semibold tracking-[-0.02em] transition-colors ${
                  isScrolled ? "text-(--color-text-primary)" : "text-white"
                }`}
              >
                {venueName}
              </p>
            </Link>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((current) => !current)}
                aria-expanded={isMobileMenuOpen}
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
                  isScrolled
                    ? "border-(--color-border-soft) bg-[rgba(var(--color-surface-rgb),0.6)] text-(--color-text-primary)"
                    : "border-white/12 bg-white/8 text-white"
                }`}
              >
                <span className="relative block h-4 w-5">
                  <span
                    className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current transition ${
                      isMobileMenuOpen ? "translate-y-[7px] rotate-45" : ""
                    }`}
                  />
                  <span
                    className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-current transition ${
                      isMobileMenuOpen ? "opacity-0" : ""
                    }`}
                  />
                  <span
                    className={`absolute left-0 top-[14px] h-0.5 w-5 rounded-full bg-current transition ${
                      isMobileMenuOpen ? "-translate-y-[7px] -rotate-45" : ""
                    }`}
                  />
                </span>
              </button>
            </div>
          </div>

          {isMobileMenuOpen ? (
            <div
              className={`relative mt-3 grid gap-3 px-3 pb-4 pt-3 lg:hidden ${mobilePanelClassName}`}
            >
              <nav className="grid gap-y-1 px-1 text-sm">
                <a
                  href={scheduleHref}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 text-left font-medium transition ${mobileChipClassName}`}
                >
                  <CalendarIcon className="h-4 w-4 shrink-0" />
                  Schedule
                </a>
                <a
                  href={photosHref}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 text-left font-medium transition ${mobileChipClassName}`}
                >
                  <PhotoIcon className="h-4 w-4 shrink-0" />
                  Photos
                </a>
                <a
                  href={contactHref}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 text-left font-medium transition ${mobileChipClassName}`}
                >
                  <PhoneIcon className="h-4 w-4 shrink-0" />
                  Contact
                </a>
                <a
                  href={detailsHref}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 text-left font-medium transition ${mobileChipClassName}`}
                >
                  <InfoIcon className="h-4 w-4 shrink-0" />
                  Details
                </a>
                <Link
                  href={bookingsHref}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 text-left font-medium transition ${mobileChipClassName}`}
                >
                  <TicketIcon className="h-4 w-4 shrink-0" />
                  My Bookings
                </Link>
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className={`flex items-center gap-3 text-left font-medium transition ${mobileChipClassName}`}
                  >
                    <LogoutIcon className="h-4 w-4 shrink-0" />
                    Sign out
                  </button>
                ) : null}
                {!isAuthenticated ? (
                  <Link
                    href={loginHref}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 text-left font-medium transition ${mobileChipClassName}`}
                  >
                    <LoginIcon className="h-4 w-4 shrink-0" />
                    Sign in
                  </Link>
                ) : null}
                {!isAuthenticated ? (
                  <Link
                    href={registerHref}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 text-left font-medium transition ${mobileChipClassName}`}
                  >
                    <UserPlusIcon className="h-4 w-4 shrink-0" />
                    Create Account
                  </Link>
                ) : null}
              </nav>
            </div>
          ) : null}

          <div className="hidden lg:flex lg:flex-row lg:items-center lg:justify-between lg:gap-3">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" className="flex min-w-0 items-center gap-3">
                <Image
                  src="/brand/court-logo.png"
                  alt={venueName}
                  width={220}
                  height={153}
                  className="h-14 w-auto shrink-0"
                />
                <p
                  className={`truncate text-base font-semibold tracking-[-0.02em] transition-colors ${
                    isScrolled ? "text-(--color-text-primary)" : "text-white"
                  }`}
                >
                  {venueName}
                </p>
              </Link>
            </div>

            <nav
              className={`flex flex-wrap items-center gap-2 text-sm transition-colors lg:justify-center ${
                isScrolled ? "text-(--color-text-secondary)" : "text-white/72"
              }`}
            >
              <a
                href={scheduleHref}
                className={`px-3 py-2 font-medium transition ${
                  isScrolled ? "hover:text-(--color-brand)" : "hover:text-white"
                }`}
              >
                Schedule
              </a>
              <a
                href={photosHref}
                className={`px-3 py-2 font-medium transition ${
                  isScrolled ? "hover:text-(--color-brand)" : "hover:text-white"
                }`}
              >
                Photos
              </a>
              <a
                href={contactHref}
                className={`px-3 py-2 font-medium transition ${
                  isScrolled ? "hover:text-(--color-brand)" : "hover:text-white"
                }`}
              >
                Contact
              </a>
              <a
                href={detailsHref}
                className={`px-3 py-2 font-medium transition ${
                  isScrolled ? "hover:text-(--color-brand)" : "hover:text-white"
                }`}
              >
                Details
              </a>
            </nav>

            <div className="hidden items-center gap-3 lg:flex">
              <span
                className={`rounded-full px-4 py-2 text-sm transition-colors ${
                  isScrolled
                    ? "border border-(--color-border-soft) bg-[rgba(var(--color-surface-rgb),0.52)] text-(--color-text-secondary)"
                    : "border border-white/10 bg-white/6 text-white/68"
                }`}
              >
                {contactPhone ?? "Guest-friendly reservations"}
              </span>
              {loggedInFirstName ? (
                <span
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isScrolled
                      ? "border border-(--color-border-soft) bg-[rgba(var(--color-surface-rgb),0.52)] text-(--color-text-secondary)"
                      : "border border-white/10 bg-white/6 text-white/78"
                  }`}
                >
                  Hello, {loggedInFirstName}!
                </span>
              ) : null}
              {!isAuthenticated ? (
                <Link
                  href={loginHref}
                  className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                    isScrolled
                      ? "border border-(--color-border-soft) bg-[rgba(var(--color-surface-rgb),0.52)] text-(--color-text-secondary) hover:border-(--color-brand) hover:text-(--color-brand)"
                      : "border border-white/10 bg-white/6 text-white/78 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  Login
                </Link>
              ) : (
                <Link
                  href={bookingsHref}
                  className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                    isScrolled
                      ? "border border-(--color-border-soft) bg-[rgba(var(--color-surface-rgb),0.52)] text-(--color-text-secondary) hover:border-(--color-brand) hover:text-(--color-brand)"
                      : "border border-white/10 bg-white/6 text-white/78 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  My Bookings
                </Link>
              )}

              <a
                href="#book-now"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-(--color-brand-accent) px-5 py-2.5 text-sm font-semibold text-(--color-brand-strong) transition hover:bg-(--color-brand-accent-hover)"
              >
                Reserve now
              </a>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

async function syncAuthenticatedUserState(
  supabase: ReturnType<typeof createPublicSupabaseClient>,
  userId: string | null,
  userMetadata: unknown,
  setIsAuthenticated: (value: boolean) => void,
  setLoggedInFirstName: (value: string | null) => void,
) {
  if (!userId) {
    setIsAuthenticated(false);
    setLoggedInFirstName(null);
    return;
  }

  setIsAuthenticated(true);

  const metadataFirstName = getSessionFirstName(userMetadata);
  if (metadataFirstName) {
    setLoggedInFirstName(metadataFirstName);
    return;
  }

  setLoggedInFirstName(await fetchProfileFirstName(supabase, userId));
}

function getSessionFirstName(userMetadata: unknown) {
  if (!userMetadata || typeof userMetadata !== "object") {
    return null;
  }

  const metadata = userMetadata as Record<string, unknown>;
  const displayName =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : null;

  if (!displayName) {
    return null;
  }

  const firstName = displayName.trim().split(/\s+/)[0];
  return firstName || null;
}

async function fetchProfileFirstName(
  supabase: ReturnType<typeof createPublicSupabaseClient>,
  userId: string,
) {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();

    if (!data || typeof data !== "object") {
      return null;
    }

    const profile = data as Record<string, unknown>;
    const displayName = stringOrNull(profile.display_name);

    if (!displayName) {
      return null;
    }

    const firstName = displayName.split(/\s+/)[0]?.trim();
    return firstName || null;
  } catch {
    return null;
  }
}

function stringOrNull(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
}

function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function PhotoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M21 16l-5-5-7 7" />
    </svg>
  );
}

function PhoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72l.34 2.7a2 2 0 0 1-.57 1.7l-1.3 1.3a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 1.7-.57l2.7.34A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function InfoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6" />
      <path d="M12 7h.01" />
    </svg>
  );
}

function TicketIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7z" />
      <path d="M12 5v14" strokeDasharray="2 3" />
    </svg>
  );
}

function LoginIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  );
}

function LogoutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function UserPlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </svg>
  );
}
