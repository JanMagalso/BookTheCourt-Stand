import Link from "next/link";
import type { ReactElement, SVGProps } from "react";

import { HeroNav } from "@/components/hero-nav";
import { LoadingImage } from "@/components/loading-image";
import { AmenitiesPreview } from "@/components/showcase/amenities-preview";
import { FacilityPhotoMosaic } from "@/components/showcase/facility-photo-mosaic";
import { LiveBookingShell } from "@/components/showcase/live-booking-shell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getVenueSnapshot } from "@/lib/site-data";

export default async function Home() {
  const snapshot = await getVenueSnapshot();
  const { venue, courts, faqs } = snapshot;
  const courtCount = courts.length;
  const heroImage = venue.galleryImages[0] ?? "/venue-placeholder.svg";
  const amenityList =
    venue.amenities.length > 0
      ? venue.amenities
      : fallbackAmenities(venue, courtCount);
  return (
    <main className="min-h-screen overflow-x-hidden bg-(--background) text-(--color-text-primary)">
      <section className="relative overflow-hidden bg-(--color-hero) text-white">
        <div className="absolute inset-0">
          <LoadingImage
            src={heroImage}
            alt={venue.name}
            fill
            priority
            wrapperClassName="absolute inset-0"
            className="object-cover opacity-24"
            sizes="100vw"
            skeletonClassName="bg-[image:var(--gradient-hero-skeleton)]"
          />
          <div className="absolute inset-0 bg-[image:var(--gradient-hero-overlay)]" />
          <div className="absolute inset-0 opacity-35 [background-image:var(--gradient-hero-grid)] [background-position:center_center] [background-size:118px_118px]" />
          <div className="absolute left-1/2 top-[-12%] h-[620px] w-[620px] -translate-x-1/2 rounded-full border border-white/8" />
          <div className="absolute inset-x-[12%] bottom-[24%] h-[160px] rounded-[999px] border border-[color:rgba(213,239,118,0.14)]" />
        </div>

        <HeroNav
          venueName={venue.name}
          contactPhone={venue.contactPhone}
        />

        <div className="relative mx-auto flex min-h-[640px] w-full max-w-[1680px] flex-col px-4 pb-12 pt-24 sm:min-h-[760px] sm:px-6 sm:pb-24 sm:pt-28 lg:px-10 lg:pt-28">
          <div className="relative z-10 mt-auto max-w-5xl pb-6 pt-8 sm:pb-12 sm:pt-14 lg:pt-16">
            <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-white/80 sm:mb-6 sm:gap-3 sm:text-sm">
              <span className="rounded-full border border-white/12 bg-white/8 px-3 py-2 backdrop-blur sm:px-4">
                Reserve Online
              </span>
              <span className="flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-2 backdrop-blur sm:px-4">
                <MapPinIcon className="h-4 w-4" />
                {venue.address}
              </span>
            </div>

            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-brand-accent) sm:text-sm">
              {venue.name}
            </p>
            <h2 className="mt-3 sm:text-2xl md:text-3xl lg:text-[3.4rem] font-semibold leading-[0.94]">
              Reserve your court at
            </h2>
            <h1 className="mt-3 max-w-[11ch] text-[2.55rem] font-semibold leading-[0.94] tracking-[-0.06em] text-white sm:max-w-4xl sm:text-5xl md:text-6xl lg:text-[6.4rem]">
              {venue.name}.
            </h1>
            <p className="mt-4 max-w-[34ch] text-sm leading-6 text-white/76 sm:mt-6 sm:max-w-3xl sm:text-base sm:leading-7 lg:text-lg">
              {venue.about}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:gap-4 sm:flex-row">
              <a
                href="#book-now"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-(--color-brand-accent) px-6 py-3 text-sm font-semibold text-(--color-brand-strong) transition hover:bg-(--color-brand-accent-hover)"
              >
                Reserve your session
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </a>
              <a
                href={venue.googleMapsUrl}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/16 bg-white/8 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:border-white/28 hover:bg-white/12"
              >
                View venue location
                <ExternalLinkIcon className="ml-2 h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section
        id="venue-info"
        className="relative z-10 px-3 pb-16 pt-10 sm:px-6 sm:pt-14 lg:px-10 lg:pt-16"
      >
        <div className="mx-auto w-full max-w-[1680px]">
          <Card className="border-(--color-border-card)">
            <CardHeader className="pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-brand)">
                Facility Overview
              </p>
              <CardTitle className="mt-2 text-2xl sm:text-3xl lg:text-[2.2rem]">
                Everything players need before they book
              </CardTitle>
              <CardDescription className="mt-3 max-w-3xl text-base leading-7">
                Amenities are grouped for quick scanning, so guests can check
                what matters most before choosing a session.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-8">
              <AmenitiesPreview amenities={amenityList} />
            </CardContent>
          </Card>
        </div>
      </section>

      <section
        id="gallery"
        className="mx-auto w-full max-w-[1680px] px-3 pb-16 sm:px-6 lg:px-10"
      >
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-brand)">
              Venue Highlights
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-(--color-text-primary) sm:text-3xl lg:text-[2.4rem]">
              Get a feel for the venue before you visit
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-(--color-text-muted)">
            Browse the courts, atmosphere, and player areas before you lock in
            your next session.
          </p>
        </div>
        <FacilityPhotoMosaic photos={venue.galleryImages} title={venue.name} />
      </section>

      <LiveBookingShell snapshot={snapshot} />

      <section id="contact" className="px-3 pb-16 pt-8 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-[1680px]">
          <div className="mb-8 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-brand)">
              Contact Details
            </p>
            <h2 className="mt-4 text-[2.4rem] font-semibold leading-[0.95] tracking-[-0.05em] text-(--color-text-primary) sm:text-[3.2rem] lg:text-[4.1rem]">
              Find {venue.name} with ease.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-(--color-text-secondary) sm:text-[1.05rem]">
              View the exact venue location, check the latest contact details,
              and head over when you&apos;re ready to play.
            </p>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-white/60 bg-[rgba(var(--color-surface-rgb),0.54)] shadow-[0_28px_90px_rgba(var(--color-shadow-brand-rgb),0.1)] backdrop-blur-2xl">
            <div className="border-b border-[color:var(--color-border-neutral-200)] bg-[image:var(--gradient-shell-header)] px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-brand)]">
                    Visit & Connect
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--color-text-secondary)]">
                    Directions, contact details, and public venue info in one
                    place.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-[rgba(var(--color-surface-rgb),0.62)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-brand-strong)] backdrop-blur-md">
                  <MapPinIcon className="h-3.5 w-3.5" />
                  Venue Map
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 lg:p-8">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(340px,0.98fr)] lg:items-start">
                <div className="space-y-4">
                  <ContactDetail
                    icon={MapPinIcon}
                    label="Address"
                    value={venue.address}
                  />
                  <ContactDetail
                    icon={MailIcon}
                    label="Email"
                    value={venue.contactEmail ?? "Unavailable"}
                    href={
                      venue.contactEmail
                        ? `mailto:${venue.contactEmail}`
                        : undefined
                    }
                  />
                  <ContactDetail
                    icon={ClockIcon}
                    label="Hours"
                    value={venue.businessHours}
                    note="Hours subject to change. Live availability is always accurate in the booking board."
                  />
                  {venue.contactPhone ? (
                    <ContactDetail
                      icon={PhoneIcon}
                      label="Phone"
                      value={venue.contactPhone}
                      href={`tel:${venue.contactPhone.replace(/\s+/g, "")}`}
                    />
                  ) : null}
                  <div className="flex flex-wrap gap-3 pt-2">
                    <a
                      href={venue.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center justify-center rounded-full bg-[color:var(--color-brand-strong)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(var(--color-shadow-brand-rgb),0.18)] transition hover:bg-[color:var(--color-brand-strong-hover)]"
                    >
                      Open in Google Maps
                      <ExternalLinkIcon className="ml-2 h-4 w-4" />
                    </a>
                    {venue.contactFacebook ? (
                      <a
                        href={venue.contactFacebook}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#8bb4ff] bg-[rgba(24,119,242,0.14)] px-5 py-3 text-sm font-semibold text-[#1877f2] backdrop-blur-md transition hover:border-[#1877f2] hover:bg-[rgba(24,119,242,0.2)] hover:text-[#1664d9]"
                      >
                        <FacebookIcon className="mr-2 h-4 w-4" />
                        Facebook
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="overflow-hidden rounded-[1.8rem] border border-white/65 bg-[rgba(var(--color-surface-rgb),0.4)] p-3 shadow-[0_18px_50px_rgba(var(--color-shadow-brand-rgb),0.08)] backdrop-blur-xl">
                  <div className="mb-3 flex items-center justify-between rounded-[1rem] border border-white/70 bg-[rgba(var(--color-surface-rgb),0.58)] px-4 py-3 backdrop-blur-md">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-brand)]">
                        Venue Location
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--color-text-secondary)]">
                        Tap the map or open full directions in Google Maps.
                      </p>
                    </div>
                    <a
                      href={venue.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-[rgba(var(--color-surface-rgb),0.7)] text-[color:var(--color-brand-strong)] backdrop-blur-md transition hover:border-[color:var(--color-brand)] hover:text-[color:var(--color-brand)]"
                      aria-label="Open venue location in Google Maps"
                    >
                      <ExternalLinkIcon className="h-4 w-4" />
                    </a>
                  </div>
                  <div className="aspect-[16/11] w-full overflow-hidden rounded-[1.35rem] border border-[color:var(--color-border-soft)]">
                    <iframe
                      title={`${venue.name} map`}
                      src={getGoogleMapsEmbedUrl(
                        venue.googleMapsUrl,
                        `${venue.name} ${venue.address}`.trim(),
                      )}
                      className="h-full w-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-3 pb-16 pt-6 sm:px-6 lg:px-10">
        <div className="mx-auto grid w-full max-w-[1680px] grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="border-[color:var(--color-border-highlight)] bg-[linear-gradient(180deg,var(--color-surface-highlight)_0%,var(--color-surface-highlight-soft)_100%)] shadow-[0_18px_50px_rgba(var(--color-shadow-brand-rgb),0.12)]">
            <CardHeader className="pb-4">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--color-border-highlight)] bg-[rgba(var(--color-surface-rgb),0.72)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--color-warning-strong)]">
                <AlertIcon className="h-3.5 w-3.5" />
                Cancellation Policy
              </div>
              <CardTitle className="mt-4 text-xl sm:text-2xl">
                Clear expectations before players checkout
              </CardTitle>
              <CardDescription className="mt-3">
                Review the reservation policy before finalizing your booking.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="rounded-[1.4rem] border border-[color:var(--color-border-highlight-soft)] bg-[rgba(var(--color-surface-rgb),0.8)] px-5 py-5 text-sm leading-7 text-[color:var(--color-text-secondary)]">
                {venue.cancellationPolicy}
              </p>
            </CardContent>
          </Card>

          <Card className="border-[color:var(--color-border-card)]">
            <CardHeader className="pb-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand)]">
                FAQ & Operations
              </p>
              <CardTitle className="mt-2 text-2xl sm:text-3xl">
                Common booking questions, answered clearly
              </CardTitle>
              <CardDescription className="mt-3 max-w-3xl text-base leading-7">
                Policies, payment flow, and venue details stay easy to browse
                without overwhelming the booking experience.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map((faq, index) => (
                  <AccordionItem
                    key={faq.question}
                    value={`faq-${index}`}
                    className="rounded-[1.5rem] border border-[color:var(--color-border-light)] bg-[rgba(var(--color-surface-rgb),0.72)] px-5 py-3"
                  >
                    <AccordionTrigger className="py-3 text-lg font-semibold text-[color:var(--color-text-primary)]">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-1 text-sm leading-7 text-[color:var(--color-text-muted)]">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <footer className="mt-8 flex flex-col gap-4 border-t border-[color:var(--color-border-light)] pt-6 text-sm text-[color:var(--color-text-muted)] md:flex-row md:items-center md:justify-between">
                <p>Built for a modern, sport-first venue booking experience.</p>
                <div className="flex flex-wrap gap-3">
                  {venue.socialLinks.map((link, index) => (
                    <Link
                      key={`${link.label}-${index}`}
                      href={link.href}
                      className="rounded-full border border-[color:var(--color-border-soft)] px-4 py-2 text-[color:var(--color-text-secondary)] transition hover:border-[color:var(--color-brand)] hover:text-[color:var(--color-brand)]"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </footer>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="px-3 pb-8 pt-2 sm:px-6 lg:px-10">
        <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4 rounded-[1.75rem] border border-[color:var(--color-border-card)] bg-[rgba(var(--color-surface-rgb),0.7)] px-5 py-5 shadow-[0_16px_48px_rgba(var(--color-shadow-brand-rgb),0.08)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <LoadingImage
              src="/brand/court-logo.png"
              alt={venue.name}
              width={136}
              height={94}
              className="h-11 w-auto shrink-0 object-contain"
              skeletonClassName="bg-[image:var(--gradient-loading-neutral)]"
            />

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-brand)]">
                {venue.name}
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--color-text-secondary)]">
                Powered by{" "}
                <span className="font-semibold text-[color:var(--color-text-primary)]">
                  BookTheCourt
                </span>
                .
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-[color:var(--color-text-muted)]">
            <a
              href="#book-now"
              className="rounded-full border border-[color:var(--color-border-soft)] px-4 py-2 transition hover:border-[color:var(--color-brand)] hover:text-[color:var(--color-brand)]"
            >
              Book now
            </a>
            <a
              href={venue.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[color:var(--color-border-soft)] px-4 py-2 transition hover:border-[color:var(--color-brand)] hover:text-[color:var(--color-brand)]"
            >
              Venue location
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function fallbackAmenities(
  venue: Awaited<ReturnType<typeof getVenueSnapshot>>["venue"],
  courtCount: number,
) {
  return [
    `${courtCount || venue.indoorCourtCount + venue.outdoorCourtCount} playable courts`,
    venue.hasNightLighting ? "Night lighting" : "Day play access",
    "Guest booking flow",
    "Flexible venue access",
    "Training friendly layout",
    "Modern payment verification",
  ];
}

function ContactDetail({
  icon: Icon,
  label,
  value,
  href,
  note,
}: {
  icon: (props: SVGProps<SVGSVGElement>) => ReactElement;
  label: string;
  value: string;
  href?: string;
  note?: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-[1.35rem] border border-[color:var(--color-border-light)] bg-[rgba(var(--color-surface-rgb),0.84)] px-4 py-4 shadow-[0_10px_28px_rgba(var(--color-shadow-brand-rgb),0.04)] sm:px-5">
      <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--color-brand-success-border)] bg-[color:var(--color-surface-accent)] text-[color:var(--color-brand)]">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--color-text-soft)]">
          {label}
        </p>
        {href ? (
          <a
            href={href}
            className="mt-1 block break-words text-sm leading-6 text-[color:var(--color-text-primary)] underline-offset-4 transition hover:text-[color:var(--color-brand)] hover:underline sm:text-[1.05rem]"
          >
            {value}
          </a>
        ) : (
          <p className="mt-1 break-words text-sm leading-6 text-[color:var(--color-text-primary)] sm:text-[1.05rem]">
            {value}
          </p>
        )}
        {note ? (
          <p className="mt-1 text-sm leading-6 text-[color:var(--color-text-muted)]">
            {note}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      {...props}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function ExternalLinkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      {...props}
    >
      <path d="M14 3h7v7" />
      <path d="M10 14 21 3" />
      <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
    </svg>
  );
}

function MapPinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      {...props}
    >
      <path d="M12 22s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11Z" />
      <circle cx="12" cy="11" r="2.5" />
    </svg>
  );
}

function MailIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      {...props}
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function PhoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      {...props}
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.1 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72l.41 2.82a2 2 0 0 1-.57 1.72L7.67 9.53a16 16 0 0 0 6.8 6.8l1.27-1.28a2 2 0 0 1 1.72-.57l2.82.41A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

function ClockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.5 1.6-1.5H17V4.9c-.8-.1-1.6-.2-2.4-.2-2.4 0-4 1.5-4 4.2V11H8v3h2.6v8h2.9Z" />
    </svg>
  );
}

function AlertIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      {...props}
    >
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    </svg>
  );
}

function getGoogleMapsEmbedUrl(
  googleMapsUrl: string,
  fallbackLocation: string,
) {
  const fallbackQuery = encodeURIComponent(fallbackLocation);

  try {
    const url = new URL(googleMapsUrl);
    const isShortGoogleMapsLink =
      url.hostname === "maps.app.goo.gl" || url.hostname === "goo.gl";

    // TODO: When the schema has a dedicated Google Maps embed/src field,
    // prefer that here instead of parsing share links.
    if (isShortGoogleMapsLink) {
      return `https://www.google.com/maps?q=${fallbackQuery}&output=embed`;
    }

    const coordinatesMatch = `${url.pathname}${url.search}`.match(
      /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    );
    const placePathMatch = url.pathname.match(/\/place\/([^/]+)/);
    const query =
      url.searchParams.get("q") ||
      url.searchParams.get("query") ||
      url.searchParams.get("destination") ||
      url.searchParams.get("daddr") ||
      (coordinatesMatch
        ? `${coordinatesMatch[1]},${coordinatesMatch[2]}`
        : null) ||
      (placePathMatch
        ? decodeURIComponent(placePathMatch[1]).replace(/\+/g, " ")
        : null);

    if (query) {
      return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
    }
  } catch {
    return `https://www.google.com/maps?q=${fallbackQuery}&output=embed`;
  }

  return `https://www.google.com/maps?q=${fallbackQuery}&output=embed`;
}
