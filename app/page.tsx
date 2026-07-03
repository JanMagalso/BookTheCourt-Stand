import Link from "next/link";
import type { ReactElement, SVGProps } from "react";

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
    <main className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#edf4ef_0%,#f8f5ef_36%,#ffffff_100%)] text-[#10233b]">
      <section className="relative overflow-hidden bg-[#071712] text-white">
        <div className="absolute inset-0">
          <LoadingImage
            src={heroImage}
            alt={venue.name}
            fill
            priority
            wrapperClassName="absolute inset-0"
            className="object-cover opacity-24"
            sizes="100vw"
            skeletonClassName="bg-[linear-gradient(120deg,rgba(4,20,16,1),rgba(12,56,44,0.88),rgba(7,23,18,1))]"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(151,236,114,0.16),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(68,211,255,0.16),transparent_28%),linear-gradient(135deg,rgba(4,16,12,0.96),rgba(7,34,28,0.88)_45%,rgba(10,24,22,0.96))]" />
          <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-position:center_center] [background-size:118px_118px]" />
          <div className="absolute left-1/2 top-[-12%] h-[620px] w-[620px] -translate-x-1/2 rounded-full border border-white/8" />
          <div className="absolute inset-x-[12%] bottom-[24%] h-[160px] rounded-[999px] border border-[#d5ef76]/14" />
        </div>

        <div className="relative mx-auto flex min-h-[640px] w-full max-w-[1680px] flex-col px-4 pb-12 pt-3 sm:min-h-[760px] sm:px-6 sm:pb-24 sm:pt-5 lg:px-10">
          <header className="rounded-[1.6rem] border border-white/10 bg-[rgba(9,27,22,0.58)] px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:rounded-full sm:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center justify-between gap-3">
                <Link
                  href="/"
                  className="flex min-w-0 items-center gap-3"
                >
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#d5ef76]/28 bg-[#d5ef76]/14 text-sm font-bold uppercase tracking-[0.22em] text-[#d5ef76]">
                    PG
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold uppercase tracking-[0.18em] text-white">
                      {venue.name}
                    </p>
                    <p className="truncate text-xs text-white/58">
                      {venue.businessHours}
                    </p>
                  </div>
                </Link>

                <a
                  href="#book-now"
                  className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#d5ef76] px-4 py-2 text-sm font-semibold text-[#17352a] transition hover:bg-[#c6e663] lg:hidden"
                >
                  Book
                </a>
              </div>

              <nav className="flex flex-wrap items-center gap-2 text-sm text-white/72 lg:justify-center">
                <a
                  href="#book-now"
                  className="rounded-full border border-white/10 bg-white/6 px-4 py-2 transition hover:border-white/24 hover:bg-white/10 hover:text-white"
                >
                  Schedule
                </a>
                <a
                  href="#gallery"
                  className="rounded-full border border-white/10 bg-white/6 px-4 py-2 transition hover:border-white/24 hover:bg-white/10 hover:text-white"
                >
                  Photos
                </a>
                <a
                  href="#venue-info"
                  className="rounded-full border border-white/10 bg-white/6 px-4 py-2 transition hover:border-white/24 hover:bg-white/10 hover:text-white"
                >
                  Details
                </a>
              </nav>

              <div className="hidden items-center gap-3 lg:flex">
                <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/68">
                  {venue.contactPhone ?? "Guest-friendly reservations"}
                </span>
                <a
                  href="#book-now"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#d5ef76] px-5 py-2.5 text-sm font-semibold text-[#17352a] transition hover:bg-[#c6e663]"
                >
                  Reserve now
                </a>
              </div>
            </div>
          </header>

          <div className="relative z-10 mt-auto max-w-5xl pb-6 pt-10 sm:pb-12 sm:pt-20 lg:pt-28">
            <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-white/80 sm:mb-6 sm:gap-3 sm:text-sm">
              <span className="rounded-full border border-white/12 bg-white/8 px-3 py-2 backdrop-blur sm:px-4">
                Reserve Online
              </span>
              <span className="flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-2 backdrop-blur sm:px-4">
                <MapPinIcon className="h-4 w-4" />
                {venue.address}
              </span>
            </div>

            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d5ef76] sm:text-sm">
              {venue.name}
            </p>

            <h1 className="mt-3 max-w-[11ch] text-[2.55rem] font-semibold leading-[0.94] tracking-[-0.06em] text-white sm:max-w-4xl sm:text-5xl md:text-6xl lg:text-[6.4rem]">
              Reserve your court at {venue.name}.
            </h1>
            <p className="mt-4 max-w-[34ch] text-sm leading-6 text-white/76 sm:mt-6 sm:max-w-3xl sm:text-base sm:leading-7 lg:text-lg">
              {venue.about}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:gap-4 sm:flex-row">
              <a
                href="#book-now"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#d5ef76] px-6 py-3 text-sm font-semibold text-[#17352a] transition hover:bg-[#c6e663]"
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
        <div className="mx-auto grid w-full max-w-[1680px] grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.15fr)_360px]">
          <Card className="border-[#d9e7df] bg-white/82">
            <CardHeader className="pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#14897d]">
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

          <Card className="overflow-hidden border-[#d9e7df] bg-[linear-gradient(180deg,#15382d_0%,#102a21_100%)] text-white">
            <CardHeader className="border-b border-white/10 pb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8de3d8]">
                Contact & Links
              </p>
              <CardTitle className="mt-2 text-2xl text-white sm:text-3xl">
                Venue profile
              </CardTitle>
              <CardDescription className="mt-3 text-white/68">
                Contact details, directions, and venue links in one place.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 py-6">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
                  Address
                </p>
                <p className="mt-3 text-base leading-7 text-white/84">
                  {venue.address}
                </p>
              </div>

              <div className="grid gap-3">
                <ProfileDetail
                  icon={MailIcon}
                  label="Facility"
                  value={venue.name}
                  href={
                    venue.contactEmail
                      ? `mailto:${venue.contactEmail}`
                      : undefined
                  }
                />
                <ProfileDetail
                  icon={PhoneIcon}
                  label="Phone"
                  value={venue.contactPhone ?? "Guest support available on-site"}
                />
                <ProfileDetail
                  icon={FacebookIcon}
                  label="Facebook"
                  value={venue.name}
                  href={venue.contactFacebook ?? undefined}
                />
              </div>

              <div className="grid gap-3">
                <a
                  href={venue.googleMapsUrl}
                  className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#17352a] transition hover:bg-[#eaf6f1]"
                >
                  Open in Google Maps
                  <ExternalLinkIcon className="ml-2 h-4 w-4" />
                </a>
                <div className="flex flex-wrap gap-3">
                  {venue.socialLinks.map((link, index) => (
                    <a
                      key={`${link.label}-${link.href}-${index}`}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/6 px-4 py-2 text-sm text-white/82 transition hover:bg-white/10"
                    >
                      <SocialGlyph label={link.label} />
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>

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
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#14897d]">
              Venue Highlights
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#10233b] sm:text-3xl lg:text-[2.4rem]">
              Get a feel for the venue before you visit
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            Browse the courts, atmosphere, and player areas before you lock in
            your next session.
          </p>
        </div>
        <FacilityPhotoMosaic photos={venue.galleryImages} title={venue.name} />
      </section>

      <LiveBookingShell snapshot={snapshot} />

      <section className="px-3 pb-16 pt-6 sm:px-6 lg:px-10">
        <div className="mx-auto grid w-full max-w-[1680px] grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="border-[#eadab2] bg-[linear-gradient(180deg,#fff7df_0%,#fffdf5_100%)] shadow-[0_18px_50px_rgba(202,154,34,0.12)]">
            <CardHeader className="pb-4">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#f0dba3] bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b07a12]">
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
              <p className="rounded-[1.4rem] border border-[#efdba8] bg-white/80 px-5 py-5 text-sm leading-7 text-slate-700">
                {venue.cancellationPolicy}
              </p>
            </CardContent>
          </Card>

          <Card className="border-[#d9e7df] bg-white/88">
            <CardHeader className="pb-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#14897d]">
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
                    className="rounded-[1.5rem] border border-[#deebe4] bg-[#f9fcfb] px-5 py-3"
                  >
                    <AccordionTrigger className="py-3 text-lg font-semibold text-[#10233b]">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-1 text-sm leading-7 text-slate-600">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <footer className="mt-8 flex flex-col gap-4 border-t border-[#e4eee8] pt-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
                <p>Built for a modern, sport-first venue booking experience.</p>
                <div className="flex flex-wrap gap-3">
                  {venue.socialLinks.map((link, index) => (
                    <Link
                      key={`${link.label}-${index}`}
                      href={link.href}
                      className="rounded-full border border-[#dce8e1] px-4 py-2 text-slate-700 transition hover:border-[#14897d] hover:text-[#14897d]"
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

function ProfileDetail({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: (props: SVGProps<SVGSVGElement>) => ReactElement;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-4">
      <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-[#8de3d8]">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/48">
          {label}
        </p>
        {href ? (
          <a
            href={href}
            className="mt-1 break-words text-sm leading-6 text-white/82 underline-offset-4 transition hover:text-white hover:underline"
          >
            {value}
          </a>
        ) : (
          <p className="mt-1 break-words text-sm leading-6 text-white/82">
            {value}
          </p>
        )}
      </div>
    </div>
  );
}

function SocialGlyph({ label }: { label: string }) {
  const normalized = label.toLowerCase();

  if (normalized.includes("facebook")) {
    return <FacebookIcon className="h-4 w-4" />;
  }

  if (normalized.includes("instagram")) {
    return <CameraIcon className="h-4 w-4" />;
  }

  return <ExternalLinkIcon className="h-4 w-4" />;
}

function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function ExternalLinkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M14 3h7v7" />
      <path d="M10 14 21 3" />
      <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
    </svg>
  );
}

function MapPinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 22s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11Z" />
      <circle cx="12" cy="11" r="2.5" />
    </svg>
  );
}

function MailIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function PhoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.1 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72l.41 2.82a2 2 0 0 1-.57 1.72L7.67 9.53a16 16 0 0 0 6.8 6.8l1.27-1.28a2 2 0 0 1 1.72-.57l2.82.41A2 2 0 0 1 22 16.92Z" />
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

function CameraIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M4 7h3l2-2h6l2 2h3v12H4Z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function AlertIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    </svg>
  );
}
