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
import { formatBookingWindowLabel } from "@/lib/booking-window";
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
  const bookingWindowLabel = formatBookingWindowLabel(venue.bookingWindowDays);
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-transparent text-(--color-text-primary)">
      <section className="relative min-h-[100svh] overflow-hidden bg-(--color-hero) text-white">
        <div className="absolute inset-0">
          <LoadingImage
            src={heroImage}
            alt={venue.name}
            fill
            priority
            wrapperClassName="absolute inset-0 hero-media-animate origin-center"
            className="hero-photo object-cover object-[center_35%]"
            sizes="100vw"
            skeletonClassName="bg-[image:var(--gradient-hero-skeleton)]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(var(--color-overlay-rgb),0.68)_0%,rgba(var(--color-overlay-rgb),0.38)_42%,rgba(var(--color-overlay-rgb),0.08)_78%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(var(--color-overlay-rgb),0.34)_0%,rgba(var(--color-overlay-rgb),0.02)_34%,rgba(var(--color-overlay-rgb),0.1)_62%,rgba(var(--color-overlay-rgb),0.7)_100%)]" />
          <div className="hero-theme-wash absolute inset-0" />
          <div className="hero-grid absolute inset-0 opacity-12" />
          <div className="hero-vignette absolute inset-0" />
          <div className="absolute -right-24 top-[18%] h-[32rem] w-[32rem] rounded-full border border-white/10" />
          <div className="absolute -right-2 top-[28%] h-[20rem] w-[20rem] rounded-full border border-white/8" />
        </div>

        <HeroNav venueName={venue.name} />

        <div className="relative mx-auto flex min-h-[100svh] w-full max-w-[1680px] flex-col px-4 pb-6 pt-28 sm:px-6 sm:pb-8 sm:pt-32 lg:px-10 lg:pt-28">
          <div className="flex flex-1 items-center py-14 sm:py-16 lg:py-20">
            <div className="hero-copy relative z-10 max-w-[50rem]">
              <div className="mb-6 flex flex-wrap items-center gap-2.5">
                <span className="rounded-full border border-white/16 bg-white/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/82 backdrop-blur-md">
                  Online reservations
                </span>
                <span className="rounded-full border border-white/12 bg-black/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/66 backdrop-blur-md">
                  Live court schedule
                </span>
              </div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-(--color-brand-accent)">
                Your next game starts here
              </p>
              <h1 className="max-w-[11ch] text-[3.5rem] font-semibold leading-[0.88] tracking-[-0.07em] text-white drop-shadow-[0_12px_40px_rgba(0,0,0,0.35)] sm:text-[5rem] md:text-[5.8rem] lg:text-[6.6rem]">
                {venue.name}
              </h1>
              <p className="mt-6 max-w-[26ch] text-xl font-medium leading-[1.15] tracking-[-0.03em] text-white sm:mt-7 sm:text-[1.7rem] md:text-[1.9rem]">
                Find a court. Pick a time. Come ready to play.
              </p>
              <p className="mt-4 max-w-[34rem] text-[0.98rem] leading-7 text-white/76 sm:text-base sm:leading-8">
                Check live availability, reserve online, and send your payment
                proof in one clear booking flow.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-5">
                <a
                  href="#book-now"
                  className="hero-cta-primary inline-flex min-h-12 items-center justify-center rounded-full bg-(--color-brand-accent) px-7 py-3 text-sm font-semibold text-(--color-brand-strong) shadow-[0_18px_42px_rgba(0,0,0,0.32)] transition hover:bg-(--color-brand-accent-hover)"
                >
                  Reserve your session
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </a>
                <a
                  href={venue.googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center justify-center px-1 text-sm font-semibold text-white/88 underline-offset-4 transition hover:text-white hover:underline sm:px-2"
                >
                  View venue location
                  <ExternalLinkIcon className="ml-2 h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          <div className="hero-facts relative z-10 hidden overflow-hidden rounded-[1.6rem] border border-white/28 backdrop-blur-xl sm:grid sm:grid-cols-2 lg:grid-cols-4">
            <VenueFact
              label="Courts"
              value={String(
                courtCount || venue.indoorCourtCount + venue.outdoorCourtCount,
              )}
            />
            <VenueFact label="Booking Window" value={bookingWindowLabel} />
            <VenueFact label="Primary Payment" value={venue.paymentMethod} />
            <VenueFact
              label="Venue Ready"
              value={venue.hasNightLighting ? "Night play" : "Day play"}
            />
          </div>
        </div>
      </section>

      <section
        id="venue-info"
        className="page-section relative z-10 px-4 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-28"
      >
        <div className="mx-auto w-full max-w-[1680px]">
          <div className="section-heading max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-brand)">
              Amenities
            </p>
            <h2 className="mt-3 text-[2rem] font-semibold leading-[1.05] tracking-[-0.045em] text-(--color-text-primary) sm:text-[2.6rem]">
              What players find on site
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-(--color-text-secondary)">
              Everything you need for a comfortable session, collected in one
              quick view.
            </p>
          </div>

          <div className="mt-10">
            <AmenitiesPreview amenities={amenityList} />
          </div>
        </div>
      </section>

      <section
        id="gallery"
        className="page-section px-4 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-28"
      >
        <div className="mx-auto w-full max-w-[1680px]">
          <div className="section-heading mb-10 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-brand)">
              Photos
            </p>
            <h2 className="mt-3 text-[2rem] font-semibold tracking-[-0.045em] text-(--color-text-primary) sm:text-[2.6rem]">
              Feel the venue before you arrive
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-(--color-text-secondary)">
              Take a closer look at the courts, facilities, and atmosphere
              before choosing your schedule.
            </p>
          </div>
          <FacilityPhotoMosaic photos={venue.galleryImages} title={venue.name} />
        </div>
      </section>

      <LiveBookingShell snapshot={snapshot} />

      <section
        id="contact"
        className="page-section px-4 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-28"
      >
        <div className="mx-auto w-full max-w-[1680px]">
          <div className="section-heading mb-12 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-brand)">
              Contact
            </p>
            <h2 className="mt-3 text-[2rem] font-semibold leading-[1.05] tracking-[-0.045em] text-(--color-text-primary) sm:text-[2.6rem] lg:text-[3.2rem]">
              Know where to go before game time
            </h2>
          </div>

          <div className="grid overflow-hidden rounded-[2rem] border border-(--color-border-card) bg-[rgba(var(--color-surface-rgb),0.68)] shadow-[0_26px_80px_rgba(var(--color-shadow-rgb),0.1)] lg:grid-cols-[minmax(0,0.82fr)_minmax(420px,1.18fr)]">
            <div className="space-y-6 p-6 sm:p-8 lg:p-10">
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
                note="Live availability stays accurate in the booking board."
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
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-(--color-brand-strong) px-5 py-3 text-sm font-semibold text-white transition hover:bg-(--color-brand-strong-hover)"
                >
                  Open in Google Maps
                  <ExternalLinkIcon className="ml-2 h-4 w-4" />
                </a>
                {venue.contactFacebook ? (
                  <a
                    href={venue.contactFacebook}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-(--color-border-soft) px-5 py-3 text-sm font-semibold text-(--color-text-secondary) transition hover:border-(--color-brand) hover:text-(--color-brand)"
                  >
                    Facebook
                  </a>
                ) : null}
              </div>
            </div>

            <div className="min-h-[360px] overflow-hidden border-t border-(--color-border-soft) bg-(--color-surface) lg:border-l lg:border-t-0">
              <div className="h-full min-h-[360px] w-full">
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
      </section>

      <section className="page-section px-4 py-16 sm:px-6 sm:py-20 lg:px-10 lg:py-24">
        <div className="mx-auto grid w-full max-w-[1680px] items-start gap-8 lg:grid-cols-[minmax(300px,0.36fr)_minmax(0,0.64fr)] lg:gap-10">
          <div className="theme-gradient-panel relative overflow-hidden rounded-[2rem] bg-(--color-brand-strong) p-6 text-white shadow-[0_24px_72px_rgba(var(--color-shadow-brand-rgb),0.24)] sm:p-8">
            <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-5 -top-8 h-28 w-28 rounded-full border border-white/10" />
            <p className="relative text-xs font-semibold uppercase tracking-[0.22em] text-(--color-brand-accent)">
              Cancellation
            </p>
            <h2 className="relative mt-3 text-[1.75rem] font-semibold tracking-[-0.04em] text-white sm:text-[2.1rem]">
              Terms before you pay
            </h2>
            <p className="relative mt-5 text-sm leading-7 text-white/72 sm:text-base sm:leading-8">
              {venue.cancellationPolicy}
            </p>
            <p className="relative mt-8 border-t border-white/12 pt-5 text-xs font-semibold uppercase tracking-[0.16em] text-white/54">
              Please review before checkout
            </p>
          </div>

          <div className="theme-gradient-surface rounded-[2rem] border border-(--color-border-card) p-6 shadow-[0_22px_70px_rgba(var(--color-shadow-rgb),0.08)] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-brand)">
              FAQ
            </p>
            <h2 className="mt-3 text-[1.75rem] font-semibold tracking-[-0.04em] text-(--color-text-primary) sm:text-[2.1rem]">
              Common booking questions
            </h2>
            <Accordion type="single" collapsible className="mt-6 divide-y divide-(--color-border-soft) border-y border-(--color-border-soft)">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={faq.question}
                  value={`faq-${index}`}
                  className="border-0"
                >
                  <AccordionTrigger className="py-5 text-left text-base font-semibold text-(--color-text-primary) hover:no-underline sm:text-lg">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-sm leading-7 text-(--color-text-muted)">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      <footer className="px-4 py-10 sm:px-6 lg:px-10">
        <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <LoadingImage
              src="/brand/court-logo.png"
              alt={venue.name}
              width={136}
              height={94}
              className="h-10 w-auto shrink-0 object-contain"
              skeletonClassName="bg-[image:var(--gradient-loading-neutral)]"
            />
            <div>
              <p className="text-sm font-semibold text-(--color-text-primary)">
                {venue.name}
              </p>
              <p className="mt-1 text-sm text-(--color-text-muted)">
                Powered by BookTheCourt
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-(--color-text-muted)">
            <a
              href="#book-now"
              className="transition hover:text-(--color-brand)"
            >
              Book now
            </a>
            <a
              href={venue.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-(--color-brand)"
            >
              Venue location
            </a>
            {venue.socialLinks.map((link, index) => (
              <Link
                key={`${link.label}-${index}`}
                href={link.href}
                className="transition hover:text-(--color-brand)"
              >
                {link.label}
              </Link>
            ))}
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

function VenueFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-white/18 px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-l sm:border-white/18 sm:first:border-l-0 lg:px-6 lg:py-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/72">
        {label}
      </p>
      <p className="mt-2 truncate text-lg font-semibold leading-none tracking-[-0.035em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.24)] sm:text-xl">
        {value}
      </p>
    </div>
  );
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
    <div className="flex items-start gap-4 border-b border-(--color-border-soft) pb-5 last:border-b-0 last:pb-0">
      <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--color-surface-accent) text-(--color-brand)">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-(--color-text-soft)">
          {label}
        </p>
        {href ? (
          <a
            href={href}
            className="mt-1 block break-words text-sm leading-6 text-(--color-text-primary) underline-offset-4 transition hover:text-(--color-brand) hover:underline sm:text-[1.05rem]"
          >
            {value}
          </a>
        ) : (
          <p className="mt-1 break-words text-sm leading-6 text-(--color-text-primary) sm:text-[1.05rem]">
            {value}
          </p>
        )}
        {note ? (
          <p className="mt-1 text-sm leading-6 text-(--color-text-muted)">
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
