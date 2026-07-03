"use client";

import { useMemo, useState } from "react";

import { AvailabilityBoard } from "@/components/availability-board";
import { BookingIntakeForm } from "@/components/booking-intake-form";
import type { SlotSelection, VenueSnapshot } from "@/lib/site-data";

type AvailabilityBookingExperienceProps = {
  snapshot: VenueSnapshot;
};

export function AvailabilityBookingExperience({
  snapshot,
}: AvailabilityBookingExperienceProps) {
  const [selectedSlot, setSelectedSlot] = useState<SlotSelection | null>(null);

  const nextAvailableSlot = useMemo(() => {
    for (const row of snapshot.availabilityRows) {
      const openCourt = row.courts.find((court) => court.status === "available");
      if (openCourt) {
        return {
          courtId: openCourt.courtId,
          courtName: openCourt.courtName,
          startTime: row.startTime,
          endTime: row.endTime,
          playDate: snapshot.selectedDate,
          timeLabel: row.timeLabel,
        } satisfies SlotSelection;
      }
    }

    return null;
  }, [snapshot]);

  return (
    <>
      <AvailabilityBoard snapshot={snapshot} onSelectSlot={setSelectedSlot} />

      <section id="book" className="px-2 py-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-[0_20px_80px_rgba(12,24,44,0.08)] md:flex md:items-center md:justify-between md:px-8">
          <div>
            <p className="text-sm uppercase tracking-[0.32em] text-cyan-700">Book From Slots</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Select an available court slot to start booking
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              Use the availability board above as the entry point. Click any available slot and
              we&apos;ll open the confirmation modal for that exact court and time.
            </p>
          </div>

          {nextAvailableSlot ? (
            <button
              type="button"
              onClick={() => setSelectedSlot(nextAvailableSlot)}
              className="mt-5 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-900 md:mt-0"
            >
              Book next available slot
            </button>
          ) : (
            <div className="mt-5 rounded-full border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-800 md:mt-0">
              No open slots right now
            </div>
          )}
        </div>
      </section>

      <BookingIntakeForm
        courts={snapshot.courts}
        venue={snapshot.venue}
        selectedSlot={selectedSlot}
        onClose={() => setSelectedSlot(null)}
      />
    </>
  );
}
