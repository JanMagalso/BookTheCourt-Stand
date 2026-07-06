import { WarehouseShowcaseBookingBoard } from "@/components/warehouse-showcase-booking-board";
import type { VenueSnapshot } from "@/lib/site-data";

export function LiveBookingShell({ snapshot }: { snapshot: VenueSnapshot }) {
  return (
    <section
      id="book-now"
      className="mx-auto w-full max-w-[1680px] px-3 pb-12 sm:px-6 lg:px-10"
    >
      <div className="overflow-hidden rounded-[2rem] border border-[color:var(--color-border-strong)] bg-[image:var(--gradient-shell)] shadow-[0_24px_70px_rgba(var(--color-shadow-brand-rgb),0.07)]">
        <div className="border-b border-[color:var(--color-border-neutral-200)] bg-[image:var(--gradient-shell-header)] px-6 py-6 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-brand)]">
            Court Availability
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[color:var(--color-text-primary)]">
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
