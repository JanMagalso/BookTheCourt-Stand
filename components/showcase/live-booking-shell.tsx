import { WarehouseShowcaseBookingBoard } from "@/components/warehouse-showcase-booking-board";
import type { VenueSnapshot } from "@/lib/site-data";

export function LiveBookingShell({ snapshot }: { snapshot: VenueSnapshot }) {
  return (
    <section
      id="book-now"
      className="mx-auto w-full max-w-[1680px] px-3 pb-12 sm:px-6 lg:px-10"
    >
      <div className="overflow-hidden rounded-[2rem] border border-[#d5e1da] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbf9_100%)] shadow-[0_24px_70px_rgba(22,46,39,0.07)]">
        <div className="border-b border-[#e3ece6] bg-[radial-gradient(circle_at_top_left,rgba(213,239,118,0.16),transparent_28%),linear-gradient(180deg,rgba(20,137,125,0.06),rgba(255,255,255,0))] px-6 py-6 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#14897d]">
            Court Availability
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#10233b]">
            Book {snapshot.venue.name}
          </h2>
          <p className="mt-3 max-w-4xl text-base leading-7 text-slate-600">
            Check real-time court availability, review pricing, and move
            through checkout in one streamlined booking flow.
          </p>
        </div>

        <div className="overflow-x-visible p-0 sm:p-5">
          <WarehouseShowcaseBookingBoard snapshot={snapshot} />
        </div>
      </div>
    </section>
  );
}
