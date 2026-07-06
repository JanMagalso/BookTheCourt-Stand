"use client";

import type { ReactElement, SVGProps } from "react";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

type AmenityCategory = "Comfort" | "Gear & Coaching" | "Tech & Lighting" | "Access & Play";

type AmenityItem = {
  label: string;
  description: string;
  icon: (props: SVGProps<SVGSVGElement>) => ReactElement;
};

const AMENITY_CATEGORY_ORDER: AmenityCategory[] = [
  "Comfort",
  "Gear & Coaching",
  "Tech & Lighting",
  "Access & Play",
];

const MOBILE_AMENITY_PREVIEW_LIMIT = 3;
const DESKTOP_AMENITY_PREVIEW_LIMIT = 8;

export function AmenitiesPreview({ amenities }: { amenities: string[] }) {
  const groups = buildAmenityGroups(amenities);
  const allAmenities = groups
    .flatMap((group) => group.items.map((item) => ({ ...item, category: group.title })))
  const mobileAmenities = allAmenities.slice(0, MOBILE_AMENITY_PREVIEW_LIMIT);
  const desktopAmenities = allAmenities.slice(0, DESKTOP_AMENITY_PREVIEW_LIMIT);
  const totalAmenities = groups.reduce((sum, group) => sum + group.items.length, 0);
  const desktopPreviewGroups = groups
    .map((group) => ({
      ...group,
      items: desktopAmenities
        .filter((item) => item.category === group.title)
        .map((item) => ({
          label: item.label,
          description: item.description,
          icon: item.icon,
        })),
    }))
    .filter((group) => group.items.length > 0);
  const hasMoreMobileAmenities = totalAmenities > mobileAmenities.length;
  const hasMoreDesktopAmenities = totalAmenities > desktopAmenities.length;

  return (
    <>
      <div className="grid gap-3 md:hidden">
        <div className="grid gap-3 sm:grid-cols-2">
          {mobileAmenities.map((item) => (
            <div
              key={item.label}
              className="rounded-[1.35rem] border border-[color:var(--color-border-light)] bg-[linear-gradient(180deg,rgba(var(--color-surface-rgb),0.7),rgba(var(--color-surface-rgb),0.52))] px-4 py-4 shadow-[0_16px_36px_rgba(var(--color-shadow-rgb),0.08)] backdrop-blur-md transition-transform duration-200 hover:-translate-y-0.5"
            >
              <div className="flex items-start gap-3">
                <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--color-border-subtle)] bg-[linear-gradient(180deg,rgba(var(--color-surface-rgb),0.94),rgba(var(--color-surface-rgb),0.62))] text-[color:var(--color-brand)] shadow-[0_10px_26px_rgba(var(--color-shadow-brand-rgb),0.08)]">
                  <item.icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[color:var(--color-text-primary)]">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--color-text-muted)]">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {hasMoreMobileAmenities ? (
          <AllAmenitiesDrawer groups={groups} totalAmenities={totalAmenities} />
        ) : null}
      </div>

      <div className="hidden space-y-8 md:block">
        {desktopPreviewGroups.map((group) => (
          <div key={group.title}>
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(20,137,125,0.22),rgba(20,137,125,0))]" />
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-brand)]">
                {group.title}
              </p>
              <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(20,137,125,0),rgba(20,137,125,0.22))]" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map((item) => (
                <div
                  key={`${group.title}-${item.label}`}
                  className="rounded-[1.75rem] border border-[color:var(--color-border-light)] bg-[linear-gradient(180deg,rgba(var(--color-surface-rgb),0.72),rgba(var(--color-surface-rgb),0.54))] px-5 py-5 shadow-[0_16px_40px_rgba(var(--color-shadow-rgb),0.08)] backdrop-blur-md transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex h-full items-start gap-4">
                    <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--color-border-subtle)] bg-[linear-gradient(180deg,rgba(var(--color-surface-rgb),0.94),rgba(var(--color-surface-rgb),0.62))] text-[color:var(--color-brand)] shadow-[0_10px_26px_rgba(var(--color-shadow-brand-rgb),0.08)]">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-[color:var(--color-text-primary)]">{item.label}</p>
                      <p className="mt-1 text-sm leading-6 text-[color:var(--color-text-muted)]">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {hasMoreDesktopAmenities ? (
          <div className="flex justify-center border-t border-[color:var(--color-border-lighter)] pt-2">
            <AllAmenitiesDrawer groups={groups} totalAmenities={totalAmenities} />
          </div>
        ) : null}
      </div>
    </>
  );
}

function AllAmenitiesDrawer({
      groups,
      totalAmenities,
}: {
  groups: ReturnType<typeof buildAmenityGroups>;
  totalAmenities: number;
}) {
  return (
    <Drawer>
      <DrawerTrigger className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--color-border-light)] bg-[linear-gradient(180deg,rgba(var(--color-surface-rgb),0.86),rgba(var(--color-surface-rgb),0.62))] px-5 py-3 text-sm font-semibold text-[color:var(--color-brand)] shadow-[0_12px_30px_rgba(var(--color-shadow-rgb),0.08)] backdrop-blur-md transition hover:border-[color:var(--color-brand)] hover:text-[color:var(--color-brand-bright)]">
        View All {totalAmenities} Amenities
      </DrawerTrigger>
      <DrawerContent className="h-[100dvh] overflow-y-auto md:mb-8 md:h-auto md:max-h-[84vh] md:max-w-[880px] md:rounded-[2rem]">
        <DrawerHeader className="border-b border-[color:var(--color-border-lighter)]">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[color:var(--color-border-soft)]" />
          <DrawerTitle>All Venue Amenities</DrawerTitle>
          <DrawerDescription className="mt-2">
            Browse the full amenity list without crowding the main page.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-6 px-5 py-5">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-brand)]">
                {group.title}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {group.items.map((item) => (
                  <div
                    key={`${group.title}-${item.label}`}
                    className="rounded-[1.25rem] border border-[color:var(--color-border-light)] bg-[linear-gradient(180deg,rgba(var(--color-surface-rgb),0.72),rgba(var(--color-surface-rgb),0.54))] px-4 py-4 shadow-[0_12px_30px_rgba(var(--color-shadow-rgb),0.06)] backdrop-blur-md"
                  >
                    <div className="flex items-start gap-3">
                      <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--color-border-subtle)] bg-[linear-gradient(180deg,rgba(var(--color-surface-rgb),0.94),rgba(var(--color-surface-rgb),0.62))] text-[color:var(--color-brand)]">
                        <item.icon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--color-text-primary)]">
                          {item.label}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[color:var(--color-text-muted)]">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <DrawerClose className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[color:var(--color-brand-strong)] px-5 py-3 text-sm font-semibold text-white">
            Done
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function buildAmenityGroups(amenities: string[]) {
  const grouped = new Map<AmenityCategory, AmenityItem[]>();

  for (const category of AMENITY_CATEGORY_ORDER) {
    grouped.set(category, []);
  }

  for (const amenity of amenities) {
    const normalized = amenity.toLowerCase();
    const category = resolveAmenityCategory(normalized);
    grouped.get(category)?.push({
      label: titleCaseAmenity(amenity),
      description: amenityDescription(normalized),
      icon: resolveAmenityIcon(normalized),
    });
  }

  return AMENITY_CATEGORY_ORDER.map((title) => ({
    title,
    items: grouped.get(title) ?? [],
  })).filter((group) => group.items.length > 0);
}

function resolveAmenityCategory(value: string): AmenityCategory {
  if (
    value.includes("shower") ||
    value.includes("locker") ||
    value.includes("restroom") ||
    value.includes("lounge") ||
    value.includes("cafe") ||
    value.includes("parking")
  ) {
    return "Comfort";
  }

  if (
    value.includes("coach") ||
    value.includes("lesson") ||
    value.includes("clinic") ||
    value.includes("rental") ||
    value.includes("gear") ||
    value.includes("pro shop") ||
    value.includes("ball")
  ) {
    return "Gear & Coaching";
  }

  if (
    value.includes("wifi") ||
    value.includes("light") ||
    value.includes("score") ||
    value.includes("camera") ||
    value.includes("stream") ||
    value.includes("tech")
  ) {
    return "Tech & Lighting";
  }

  return "Access & Play";
}

function resolveAmenityIcon(value: string) {
  if (value.includes("wifi")) return WifiIcon;
  if (value.includes("shower")) return ShowerIcon;
  if (value.includes("coach") || value.includes("lesson")) return WhistleIcon;
  if (value.includes("light")) return LightIcon;
  if (value.includes("parking")) return ParkingIcon;
  if (value.includes("rental") || value.includes("gear")) return PaddleIcon;
  if (value.includes("locker")) return LockerIcon;
  if (value.includes("cafe")) return CupIcon;
  if (value.includes("camera") || value.includes("stream")) return CameraIcon;
  return SparkIcon;
}

function amenityDescription(value: string) {
  if (value.includes("wifi")) return "Stay connected between games and bookings.";
  if (value.includes("shower")) return "Refresh quickly after league play or training.";
  if (value.includes("coach") || value.includes("lesson")) return "Structured skill-building for casual and competitive players.";
  if (value.includes("light")) return "Reliable evening sessions with visibility tuned for play.";
  if (value.includes("parking")) return "Arrival is easy for drivers and group meetups.";
  if (value.includes("rental") || value.includes("gear")) return "Travel light and still get on court fast.";
  if (value.includes("locker")) return "Secure essentials while you focus on the match.";
  if (value.includes("cafe")) return "Grab recovery drinks and light snacks on site.";
  if (value.includes("camera") || value.includes("stream")) return "Useful for recording drills, highlights, or coaching review.";
  return "Part of the complete venue experience for players and guests.";
}

function titleCaseAmenity(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function WifiIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <path d="M12 20h.01" />
      <path d="M2 8.82a16 16 0 0 1 20 0" />
    </svg>
  );
}

function ShowerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M17 7a5 5 0 0 0-10 0v6" />
      <path d="M7 13h10" />
      <path d="M17 13v3" />
      <path d="M7 13v7" />
      <path d="M17 17h3" />
      <path d="M19 11v2" />
      <path d="M21 13v2" />
      <path d="M17 21h.01M13 21h.01M9 21h.01" />
    </svg>
  );
}

function WhistleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="8" cy="16" r="4" />
      <path d="M12 16h4a4 4 0 0 0 0-8h-1l-3 4" />
      <path d="M14 8V4l4 2" />
    </svg>
  );
}

function LightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.75V18h8v-3.25A7 7 0 0 0 12 2Z" />
    </svg>
  );
}

function ParkingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M6 22V4h7a4 4 0 1 1 0 8H6" />
    </svg>
  );
}

function PaddleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M14 4c2.8 0 5 2.2 5 5 0 4.2-3.8 8.5-8 8.5S3 13.2 3 9a5 5 0 0 1 5-5Z" />
      <path d="m13.5 16.5 5.5 5.5" />
    </svg>
  );
}

function LockerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M12 3v18" />
      <path d="M9 9h.01M15 9h.01" />
    </svg>
  );
}

function CupIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M18 8h1a3 3 0 0 1 0 6h-1" />
      <path d="M3 8h15v4a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6V8Z" />
      <path d="M8 2v2M12 2v2M16 2v2" />
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

function SparkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="m12 3 1.9 4.9L19 10l-5.1 2.1L12 17l-1.9-4.9L5 10l5.1-2.1L12 3Z" />
      <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />
    </svg>
  );
}
