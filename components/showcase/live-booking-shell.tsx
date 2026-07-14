import { WarehouseShowcaseBookingBoard } from "@/components/warehouse-showcase-booking-board";
import type { VenueSnapshot } from "@/lib/site-data";

export function LiveBookingShell({ snapshot }: { snapshot: VenueSnapshot }) {
  return (
    <section
      id="book-now"
      className="page-section page-section-tinted px-3 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-28"
    >
      <div className="mx-auto w-full max-w-[1680px]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(300px,0.28fr)] lg:items-end">
          <div className="section-heading max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-brand)">
              Live Court Availability
            </p>
            <h2 className="mt-3 text-[2rem] font-semibold leading-[1.05] tracking-[-0.045em] text-(--color-text-primary) sm:text-[2.6rem] lg:text-[3.2rem]">
              Choose your court and time
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-(--color-text-secondary) sm:text-base sm:leading-7">
              Browse the live schedule for {snapshot.venue.name}. Your selected
              slots are held for 10 minutes while you complete payment.
            </p>
          </div>

          <div className="grid grid-cols-3 overflow-hidden rounded-[1.35rem] border border-(--color-border-card) bg-[rgba(var(--color-surface-rgb),0.62)] backdrop-blur-md">
            <BookingStep number="01" label="Select" />
            <BookingStep number="02" label="Review" />
            <BookingStep number="03" label="Pay" />
          </div>
        </div>

        <div className="relative mt-10 overflow-x-visible rounded-[2rem] border border-(--color-border-card) bg-[rgba(var(--color-surface-rgb),0.78)] p-0 shadow-[0_28px_90px_rgba(var(--color-shadow-brand-rgb),0.12)] backdrop-blur-xl sm:p-4">
          <WarehouseShowcaseBookingBoard snapshot={snapshot} />
        </div>
      </div>
    </section>
  );
}

function BookingStep({ number, label }: { number: string; label: string }) {
  return (
    <div className="border-l border-(--color-border-soft) px-3 py-3 first:border-l-0 sm:px-4 sm:py-4">
      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-(--color-brand)">
        {number}
      </p>
      <p className="mt-1 text-xs font-semibold text-(--color-text-primary) sm:text-sm">
        {label}
      </p>
    </div>
  );
}
