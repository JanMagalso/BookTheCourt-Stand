import { WarehouseShowcaseBookingBoard } from "@/components/warehouse-showcase-booking-board";
import type { VenueSnapshot } from "@/lib/site-data";

export function LiveBookingShell({ snapshot }: { snapshot: VenueSnapshot }) {
  return (
    <section
      id="book-now"
      className="page-section px-4 py-16 sm:px-6 sm:py-20 lg:px-10 lg:py-24"
    >
      <div className="mx-auto w-full max-w-[1680px]">
        <div className="section-heading max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-brand)">
            Live Court Availability
          </p>
          <h2 className="mt-3 text-[2rem] font-semibold leading-[1.05] tracking-[-0.045em] text-(--color-text-primary) sm:text-[2.6rem] lg:text-[3rem]">
            Choose your court and time
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-(--color-text-secondary) sm:text-base">
            Browse the live schedule for {snapshot.venue.name}. Selected slots
            are held for 10 minutes while you complete payment.
          </p>
        </div>

        <div className="relative mt-10 overflow-x-visible rounded-[1.75rem] border border-(--color-border-soft) bg-[rgba(var(--color-surface-rgb),0.72)] p-0 shadow-[0_20px_60px_rgba(var(--color-shadow-brand-rgb),0.1)] sm:p-4">
          <WarehouseShowcaseBookingBoard snapshot={snapshot} />
        </div>
      </div>
    </section>
  );
}
