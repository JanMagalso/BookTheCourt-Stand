import { WarehouseShowcaseBookingBoard } from "@/components/warehouse-showcase-booking-board";
import type { VenueSnapshot } from "@/lib/site-data";

export function LiveBookingShell({ snapshot }: { snapshot: VenueSnapshot }) {
  return (
    <section
      id="book-now"
      className="mx-auto w-full max-w-[1680px] px-3 pb-12 sm:px-6 lg:px-10"
    >
      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-[rgba(var(--color-surface-rgb),0.5)] shadow-[0_28px_90px_rgba(var(--color-shadow-brand-rgb),0.1)] backdrop-blur-2xl">
        <div className="border-b border-white/70 bg-[linear-gradient(180deg,rgba(var(--color-surface-rgb),0.62),rgba(var(--color-surface-rgb),0.4))] px-6 py-6 backdrop-blur-xl sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-brand)">
            Court Availability
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-(--color-text-primary)">
            Book {snapshot.venue.name}
          </h2>
          <p className="mt-3 hidden max-w-4xl text-base leading-7 text-(--color-text-muted) lg:visible">
            Check real-time court availability, review pricing, and move through
            checkout in one streamlined booking flow.
          </p>
        </div>

        <div className="overflow-x-visible p-0 sm:p-5">
          <WarehouseShowcaseBookingBoard snapshot={snapshot} />
        </div>
      </div>
    </section>
  );
}
