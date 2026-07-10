"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { createPublicSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";

type HeroNavProps = {
  venueName: string;
  contactPhone?: string | null;
};

export function HeroNav({ venueName, contactPhone }: HeroNavProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loggedInFirstName, setLoggedInFirstName] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const syncScrollState = () => {
      setIsScrolled(window.scrollY > 18);
    };

    syncScrollState();
    window.addEventListener("scroll", syncScrollState, { passive: true });

    return () => window.removeEventListener("scroll", syncScrollState);
  }, []);

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
    if (!hasSupabaseEnv()) {
      return;
    }

    const supabase = createPublicSupabaseClient();

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
  }, []);

  const mobilePanelClassName = isScrolled
    ? "border-t border-(--color-border-soft) bg-transparent text-(--color-text-secondary) shadow-none"
    : "border-t border-white/10 bg-transparent text-white/82 shadow-none backdrop-blur-0";

  const mobileChipClassName = isScrolled
    ? "rounded-xl px-3 py-3 text-(--color-text-secondary) hover:bg-[rgba(var(--color-surface-rgb),0.58)] hover:text-(--color-brand)"
    : "rounded-xl px-3 py-3 text-white/82 hover:bg-white/6 hover:text-white";
  const loginHref = "/login?returnTo=%2F";
  const registerHref = "/register?returnTo=%2F";

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
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <Image
                src="/brand/court-logo.png"
                alt={venueName}
                width={115}
                height={80}
                className="h-10 w-auto shrink-0"
              />
              <div className="min-w-0">
                <p
                  className={`truncate text-sm font-semibold uppercase tracking-[0.18em] transition-colors ${
                    isScrolled ? "text-(--color-text-primary)" : "text-white"
                  }`}
                >
                  {venueName}
                </p>
                <p
                  className={`truncate text-xs transition-colors ${
                    isScrolled ? "text-(--color-text-muted)" : "text-white/58"
                  }`}
                >
                  {venueName}
                </p>
              </div>
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
                  href="#book-now"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`text-left font-medium transition ${mobileChipClassName}`}
                >
                  Schedule
                </a>
                <a
                  href="#gallery"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`text-left font-medium transition ${mobileChipClassName}`}
                >
                  Photos
                </a>
                <a
                  href="#contact"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`text-left font-medium transition ${mobileChipClassName}`}
                >
                  Contact
                </a>
                <a
                  href="#venue-info"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`text-left font-medium transition ${mobileChipClassName}`}
                >
                  Details
                </a>
                <Link
                  href={loginHref}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`text-left font-medium transition ${mobileChipClassName}`}
                >
                  {isAuthenticated ? "Account" : "Login"}
                </Link>
                {!isAuthenticated ? (
                  <Link
                    href={registerHref}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`text-left font-medium transition ${mobileChipClassName}`}
                  >
                    Create Account
                  </Link>
                ) : null}
              </nav>

              <div className="border-t border-inherit px-2 pt-3">
                <p className="text-xs uppercase tracking-[0.16em] text-(--color-text-soft)">
                  Venue Line
                </p>
                <p className="mt-1 text-sm text-inherit">
                  {contactPhone ?? "Guest-friendly reservations"}
                </p>
              </div>
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
                <div className="min-w-0">
                  <p
                    className={`truncate text-sm transition-colors ${
                      isScrolled ? "text-(--color-text-muted)" : "text-white/58"
                    }`}
                  >
                    {venueName}
                  </p>
                </div>
              </Link>
            </div>

            <nav
              className={`flex flex-wrap items-center gap-2 text-sm transition-colors lg:justify-center ${
                isScrolled ? "text-(--color-text-secondary)" : "text-white/72"
              }`}
            >
              <a
                href="#book-now"
                className={`px-3 py-2 font-medium transition ${
                  isScrolled ? "hover:text-(--color-brand)" : "hover:text-white"
                }`}
              >
                Schedule
              </a>
              <a
                href="#gallery"
                className={`px-3 py-2 font-medium transition ${
                  isScrolled ? "hover:text-(--color-brand)" : "hover:text-white"
                }`}
              >
                Photos
              </a>
              <a
                href="#contact"
                className={`px-3 py-2 font-medium transition ${
                  isScrolled ? "hover:text-(--color-brand)" : "hover:text-white"
                }`}
              >
                Contact
              </a>
              <a
                href="#venue-info"
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
                  href={loginHref}
                  className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                    isScrolled
                      ? "border border-(--color-border-soft) bg-[rgba(var(--color-surface-rgb),0.52)] text-(--color-text-secondary) hover:border-(--color-brand) hover:text-(--color-brand)"
                      : "border border-white/10 bg-white/6 text-white/78 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  Account
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
      .select("first_name,last_name,full_name,display_name,name")
      .eq("id", userId)
      .maybeSingle();

    if (!data || typeof data !== "object") {
      return null;
    }

    const profile = data as Record<string, unknown>;
    const displayName =
      stringOrNull(profile.full_name) ||
      joinNameParts(profile.first_name, profile.last_name) ||
      stringOrNull(profile.display_name) ||
      stringOrNull(profile.name);

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

function joinNameParts(firstName: unknown, lastName: unknown) {
  const parts = [stringOrNull(firstName), stringOrNull(lastName)].filter(
    Boolean,
  );
  return parts.join(" ").trim() || null;
}
