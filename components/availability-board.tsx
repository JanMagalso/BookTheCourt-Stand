"use client";

import {
  formatCurrency,
  type SlotSelection,
  type VenueSnapshot,
} from "@/lib/site-data";

type AvailabilityBoardProps = {
  snapshot: VenueSnapshot;
  onSelectSlot?: (slot: SlotSelection) => void;
};

export function AvailabilityBoard({ snapshot, onSelectSlot }: AvailabilityBoardProps) {
  return (
    <section
      id="availability"
      className="rounded-[2rem] border border-white/[0.12] bg-slate-950/85 p-6 shadow-[0_30px_120px_rgba(15,23,42,0.45)] backdrop-blur md:p-8"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Availability</p>
          <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
            Tonight&apos;s court snapshot
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
            Players can review active bookings before they submit payment proof.
            Each slot below reflects the current schedule and availability.
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
          Rate per hour:{" "}
          <span className="font-semibold">{formatCurrency(snapshot.venue.hourlyRate)}</span>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-3 text-left">
          <thead>
            <tr className="text-xs uppercase tracking-[0.24em] text-slate-400">
              <th className="pb-2 pr-4 font-medium">Time</th>
              {snapshot.courts.map((court) => (
                <th key={court.id} className="pb-2 pr-4 font-medium">
                  {court.name}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {snapshot.availabilityRows.map((row) => (
              <tr key={row.timeLabel}>
                <th className="rounded-2xl bg-white/[0.05] px-4 py-4 text-sm font-medium text-white">
                  {row.timeLabel}
                </th>

                {row.courts.map((court) => (
                  <td key={`${row.timeLabel}-${court.courtId}`} className="pr-4">
                    {court.status === "available" ? (
                      <button
                        type="button"
                        onClick={() =>
                          onSelectSlot?.({
                            courtId: court.courtId,
                            courtName: court.courtName,
                            startTime: row.startTime,
                            endTime: row.endTime,
                            playDate: snapshot.selectedDate,
                            timeLabel: row.timeLabel,
                          })
                        }
                        className="w-full rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-4 text-left text-sm text-emerald-100 transition hover:border-cyan-300 hover:bg-cyan-400/15 hover:text-white"
                      >
                        <p className="font-semibold capitalize">{court.status}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/60">
                          Click to reserve
                        </p>
                      </button>
                    ) : (
                      <div
                        className={[
                          "rounded-2xl border px-4 py-4 text-sm",
                          court.status === "pending"
                            ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
                            : "border-rose-400/30 bg-rose-400/10 text-rose-100",
                        ].join(" ")}
                      >
                        <p className="font-semibold capitalize">{court.status}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/60">
                          {court.label}
                        </p>
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
