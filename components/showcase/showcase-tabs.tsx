"use client";

import { useMemo, useState } from "react";

import { LoadingImage } from "@/components/loading-image";
import { WarehouseShowcaseBookingBoard } from "@/components/warehouse-showcase-booking-board";
import {
  ShowcaseInfoCard,
  ShowcaseSectionEyebrow,
} from "@/components/showcase/showcase-primitives";
import type { VenueSnapshot } from "@/lib/site-data";

type ShowcaseTab = "schedule" | "about" | "photos" | "contact";

export function ShowcaseTabs({ snapshot }: { snapshot: VenueSnapshot }) {
  const [activeTab, setActiveTab] = useState<ShowcaseTab>("schedule");

  const tabs = useMemo(
    () => [
      { id: "schedule" as const, label: "Schedule" },
      { id: "about" as const, label: "About" },
      { id: "photos" as const, label: "Photos" },
      { id: "contact" as const, label: "Contact" },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-[#17352a] text-white"
                : "border border-[#d8e4de] bg-white text-slate-700 hover:border-[#1aa39a] hover:text-[#17352a]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "schedule" ? <WarehouseShowcaseBookingBoard snapshot={snapshot} /> : null}

      {activeTab === "about" ? (
        <ShowcaseInfoCard>
          <ShowcaseSectionEyebrow>About This Venue</ShowcaseSectionEyebrow>
          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#10233b]">
            Live facility description
          </h3>
          <p className="mt-4 text-base leading-7 text-slate-600">{snapshot.venue.about}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {snapshot.venue.amenities.map((amenity) => (
              <span
                key={amenity}
                className="rounded-full border border-[#d7e7de] bg-[#f4faf7] px-4 py-2 text-sm font-medium text-slate-700"
              >
                {amenity}
              </span>
            ))}
          </div>
        </ShowcaseInfoCard>
      ) : null}

      {activeTab === "photos" ? (
        <ShowcaseInfoCard>
          <ShowcaseSectionEyebrow>Photo Gallery</ShowcaseSectionEyebrow>
          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#10233b]">
            Facility photos
          </h3>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {snapshot.venue.galleryImages.map((photo, index) => (
              <LoadingImage
                key={`${photo}-${index}`}
                src={photo}
                alt={`${snapshot.venue.name} gallery ${index + 1}`}
                width={1200}
                height={800}
                className="h-64 w-full rounded-[1.5rem] object-cover"
                skeletonClassName="bg-[linear-gradient(110deg,rgba(219,234,254,0.92),rgba(239,246,255,0.76),rgba(219,234,254,0.92))]"
              />
            ))}
          </div>
        </ShowcaseInfoCard>
      ) : null}

      {activeTab === "contact" ? (
        <ShowcaseInfoCard>
          <ShowcaseSectionEyebrow>Contact Details</ShowcaseSectionEyebrow>
          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#10233b]">
            Public contact information
          </h3>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.25rem] bg-[#f3f8f5] p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Location</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{snapshot.venue.address}</p>
            </div>
            <div className="rounded-[1.25rem] bg-[#f3f8f5] p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Phone</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {snapshot.venue.contactPhone ?? "Unavailable"}
              </p>
            </div>
            <div className="rounded-[1.25rem] bg-[#f3f8f5] p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Email</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {snapshot.venue.contactEmail ?? "Unavailable"}
              </p>
            </div>
            <div className="rounded-[1.25rem] bg-[#f3f8f5] p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Facebook</p>
              <p className="mt-2 break-all text-sm leading-6 text-slate-700">
                {snapshot.venue.contactFacebook ?? "Unavailable"}
              </p>
            </div>
          </div>
        </ShowcaseInfoCard>
      ) : null}
    </div>
  );
}
