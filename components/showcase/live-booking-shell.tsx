import { WarehouseShowcaseBookingBoard } from "@/components/warehouse-showcase-booking-board";
import type { VenueSnapshot } from "@/lib/site-data";

export function LiveBookingShell({ snapshot }: { snapshot: VenueSnapshot }) {
  return (
    <section
      id="book-now"
      className="page-section px-4 py-16 sm:px-6 sm:py-20 lg:px-10 lg:py-24"
    >
      <div className="mx-auto w-full max-w-[1680px]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)] lg:items-end lg:gap-12">
          <div className="section-heading max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-brand)">
              Live Court Availability
            </p>
            <h2 className="mt-3 text-[2rem] font-semibold leading-[1.05] tracking-[-0.045em] text-(--color-text-primary) sm:text-[2.6rem] lg:text-[3rem]">
              Choose your court and time
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-(--color-text-secondary) sm:text-base">
              Tap available slots on the schedule to book {snapshot.venue.name}.
              Selected times are held for 10 minutes while you finish payment.
            </p>
          </div>

          <ol className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 lg:gap-2">
            <BookingStep
              number="1"
              title="Select slots"
              description="Tap one or more open times on the board."
            />
            <BookingStep
              number="2"
              title="Review & pay"
              description="Confirm your courts, then upload payment proof."
            />
            <BookingStep
              number="3"
              title="Get confirmed"
              description="The venue verifies payment and locks your booking."
            />
          </ol>
        </div>

        <div className="relative mt-10 overflow-x-visible rounded-[1.75rem] border border-(--color-border-soft) bg-[rgba(var(--color-surface-rgb),0.72)] p-0 shadow-[0_20px_60px_rgba(var(--color-shadow-brand-rgb),0.1)] sm:p-4">
          <WarehouseShowcaseBookingBoard snapshot={snapshot} />
        </div>
      </div>
    </section>
  );
}

function BookingStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <li className="flex items-start gap-3 rounded-[1.1rem] border border-(--color-border-soft) bg-[rgba(var(--color-surface-rgb),0.7)] px-4 py-3">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--color-brand) text-xs font-semibold text-white">
        {number}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-(--color-text-primary)">
          {title}
        </p>
        <p className="mt-0.5 text-xs leading-5 text-(--color-text-muted)">
          {description}
        </p>
      </div>
    </li>
  );
}
