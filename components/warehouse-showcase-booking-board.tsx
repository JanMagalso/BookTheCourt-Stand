"use client";

import {
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import {
  formatCurrency,
  getAvailabilityRows,
  type BookingSlot,
  type VenueSnapshot,
} from "@/lib/site-data";
import { createPublicSupabaseClient, hasSupabaseEnv } from "@/lib/supabase";
import { DEFAULT_BOOKING_WINDOW_DAYS, normalizeBookingWindowDays } from "@/lib/booking-window";
import { getOnlineBookingWindowEndDateKey, getScheduleDateKey, shiftScheduleDateKey } from "@/lib/facility-status-overrides";

type WarehouseShowcaseBookingBoardProps = {
  snapshot: VenueSnapshot;
};

type SelectedSlot = {
  courtId: string;
  courtName: string;
  startTime: string;
  endTime: string;
  startMinuteOffset: number;
  endMinuteOffset: number;
  timeLabel: string;
  rate: number;
};

type BookingFormState = {
  reservationName: string;
  contactEmail: string;
  contactNumber: string;
  paymentMethod: string;
  paymentReference: string;
  acceptedTerms: boolean;
  acceptedProceed: boolean;
  acceptedFeePolicy: boolean;
};

type AuthMode = "guest" | "login";

type AuthState = {
  id: string;
  email: string;
  accessToken: string;
  displayName: string | null;
};

type ReservationResumeState = {
  selectedDate: string;
  selectedSlots: SelectedSlot[];
  formState: BookingFormState;
};

type ModalStep = "details" | "payment";

const reservationResumeStorageKey = "btc-reservation-resume";

const initialFormState: BookingFormState = {
  reservationName: "",
  contactEmail: "",
  contactNumber: "",
  paymentMethod: "gcash",
  paymentReference: "",
  acceptedTerms: false,
  acceptedProceed: false,
  acceptedFeePolicy: false,
};

export function WarehouseShowcaseBookingBoard({
  snapshot,
}: WarehouseShowcaseBookingBoardProps) {
  const router = useRouter();
  const supabase = useMemo(
    () => (hasSupabaseEnv() ? createPublicSupabaseClient() : null),
    [],
  );
  const hasMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [isCompactMobile, setIsCompactMobile] = useState(false);
  const [currentSnapshot, setCurrentSnapshot] =
    useState<VenueSnapshot>(snapshot);
  const [bookings, setBookings] = useState<BookingSlot[]>(snapshot.bookings);
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);
  const [formState, setFormState] =
    useState<BookingFormState>(initialFormState);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [activeHoldIds, setActiveHoldIds] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>("details");
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [showPolicyDetails, setShowPolicyDetails] = useState(false);
  const [isHoldPending, setIsHoldPending] = useState(false);
  const [isDateNavigating, setIsDateNavigating] = useState(false);
  const [isUploadDragging, setIsUploadDragging] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("guest");
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [authStatusMessage, setAuthStatusMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const paymentProofInputId = useId();
  const pendingResumeStateRef = useRef<ReservationResumeState | null>(null);
  const paymentModalScrollRef = useRef<HTMLFormElement | null>(null);

  const groupedBlocks = useMemo(
    () => groupSelectedSlots(selectedSlots),
    [selectedSlots],
  );
  const subtotal = groupedBlocks.reduce(
    (sum, block) => sum + block.subtotalPhp,
    0,
  );
  const holdCountdown = useHoldCountdown(holdExpiresAt);
  const hasActiveHold = Boolean(
    holdExpiresAt && holdCountdown.totalSeconds > 0,
  );
  const effectiveSnapshot = useMemo(() => {
    if (bookings === currentSnapshot.bookings) {
      return currentSnapshot;
    }

    const nextSnapshot = {
      ...currentSnapshot,
      bookings,
      availabilityRows: [] as VenueSnapshot["availabilityRows"],
    };

    nextSnapshot.availabilityRows = getAvailabilityRows(nextSnapshot);
    return nextSnapshot;
  }, [bookings, currentSnapshot]);
  const scheduleRows = effectiveSnapshot.availabilityRows;
  const minSelectableDate = getTodayDateKey();
  const normalizedBookingWindowDays = normalizeBookingWindowDays(
    effectiveSnapshot.venue.bookingWindowDays,
    DEFAULT_BOOKING_WINDOW_DAYS,
  );
  const maxSelectableDate = getOnlineBookingWindowEndDateKey(
    minSelectableDate,
    normalizedBookingWindowDays,
  );

  const hasAcceptedPolicies =
    formState.acceptedTerms &&
    formState.acceptedProceed &&
    formState.acceptedFeePolicy;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const syncViewport = () => setIsCompactMobile(mediaQuery.matches);

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    const syncSession = async (
      session: Awaited<
        ReturnType<typeof supabase.auth.getSession>
      >["data"]["session"],
    ) => {
      if (!isMounted) {
        return;
      }

      if (!session?.user?.email || !session.access_token) {
        setAuthState(null);
        return;
      }

      const displayName =
        typeof session.user.user_metadata?.full_name === "string"
          ? session.user.user_metadata.full_name
          : typeof session.user.user_metadata?.name === "string"
            ? session.user.user_metadata.name
            : null;
      const contactNumber =
        typeof session.user.user_metadata?.phone === "string"
          ? session.user.user_metadata.phone
          : typeof session.user.user_metadata?.contact_number === "string"
            ? session.user.user_metadata.contact_number
            : typeof session.user.user_metadata?.mobile === "string"
              ? session.user.user_metadata.mobile
              : (session.user.phone ?? "");

      setAuthState({
        id: session.user.id,
        email: session.user.email,
        accessToken: session.access_token,
        displayName,
      });
      setAuthMode("login");
      setAuthStatusMessage("Your BookTheCourt account is connected.");

      const profileDetails = await fetchSignedInProfileDetails(
        supabase,
        session.user.id,
      );
      const resolvedReservationName =
        profileDetails.reservationName || displayName || "";
      const resolvedContactNumber =
        profileDetails.contactNumber || contactNumber;

      setFormState((current) => ({
        ...current,
        reservationName: current.reservationName || resolvedReservationName,
        contactEmail: current.contactEmail || session.user.email || "",
        contactNumber: current.contactNumber || resolvedContactNumber,
      }));
    };

    void supabase.auth.getSession().then(({ data }) => {
      void syncSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncSession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("resumeReservation") !== "1") {
      return;
    }

    const saved = readReservationResumeState();
    if (!saved) {
      clearResumeReservationQueryParam();
      return;
    }

    pendingResumeStateRef.current = saved;
  }, []);

  useEffect(() => {
    const pendingResumeState = pendingResumeStateRef.current;

    if (!pendingResumeState || isDateNavigating) {
      return;
    }

    if (pendingResumeState.selectedDate !== currentSnapshot.selectedDate) {
      const restoreReservationForDate = async () => {
        setIsDateNavigating(true);
        setStatusMessage("");

        try {
          const response = await fetch(
            `/api/venue-snapshot?date=${encodeURIComponent(
              pendingResumeState.selectedDate,
            )}`,
          );
          const nextSnapshot = (await response.json()) as VenueSnapshot;

          if (!response.ok || !nextSnapshot?.selectedDate) {
            setStatusMessage("We could not restore that day's schedule yet.");
            pendingResumeStateRef.current = null;
            clearReservationResumeState();
            clearResumeReservationQueryParam();
            return;
          }

          setCurrentSnapshot(nextSnapshot);
          setBookings(nextSnapshot.bookings);
          setSelectedSlots([]);
          setHoldExpiresAt(null);
          setActiveHoldIds([]);
          setPaymentProofFile(null);
          setIsUploadDragging(false);
          setModalStep("details");
          setIsPaymentModalOpen(false);
        } catch {
          setStatusMessage("We could not restore that day's schedule yet.");
          pendingResumeStateRef.current = null;
          clearReservationResumeState();
          clearResumeReservationQueryParam();
        } finally {
          setIsDateNavigating(false);
        }
      };

      restoreReservationForDate().catch(() => {
        setStatusMessage("We could not restore that day's schedule yet.");
        pendingResumeStateRef.current = null;
        clearReservationResumeState();
        clearResumeReservationQueryParam();
        setIsDateNavigating(false);
      });
      return;
    }

    const filteredSlots = filterRestorableSlots(
      pendingResumeState.selectedSlots,
      scheduleRows,
    );

    setSelectedSlots(filteredSlots);
    setFormState((current) => ({
      ...current,
      ...pendingResumeState.formState,
      contactEmail:
        authState?.email ||
        pendingResumeState.formState.contactEmail ||
        current.contactEmail,
    }));
    setAuthMode(authState ? "login" : "guest");
    setIsPaymentModalOpen(true);
    setModalStep("details");
    setStatusMessage(
      filteredSlots.length > 0
        ? "Your reservation details were restored after login."
        : "We restored your details, but some selected slots are no longer available.",
    );

    pendingResumeStateRef.current = null;
    clearReservationResumeState();
    clearResumeReservationQueryParam();
  }, [authState, currentSnapshot.selectedDate, isDateNavigating, scheduleRows]);

  useEffect(() => {
    if (!isPaymentModalOpen) {
      return;
    }

    const scrollY = window.scrollY;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      window.scrollTo({ top: scrollY });
    };
  }, [isPaymentModalOpen]);

  useEffect(() => {
    if (!isPaymentModalOpen || modalStep !== "payment") {
      return;
    }

    paymentModalScrollRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [isPaymentModalOpen, modalStep]);

  function closePaymentModal() {
    setIsPaymentModalOpen(false);
    setModalStep("details");
    setPaymentProofFile(null);
    setIsUploadDragging(false);
  }

  function updatePaymentProofFile(file: File | null) {
    setPaymentProofFile(file);
    setIsUploadDragging(false);
  }

  async function changeSelectedDate(nextDate: string) {
    if (nextDate === currentSnapshot.selectedDate) {
      return;
    }

    if (hasActiveHold) {
      setStatusMessage(
        "Finish or release your current hold before switching dates.",
      );
      return;
    }

    setIsDateNavigating(true);
    setStatusMessage("");

    try {
      const response = await fetch(
        `/api/venue-snapshot?date=${encodeURIComponent(nextDate)}`,
      );
      const nextSnapshot = (await response.json()) as VenueSnapshot;

      if (!response.ok || !nextSnapshot?.selectedDate) {
        setStatusMessage("We could not load that day's schedule yet.");
        return;
      }

      setCurrentSnapshot(nextSnapshot);
      setBookings(nextSnapshot.bookings);
      setSelectedSlots([]);
      setHoldExpiresAt(null);
      setActiveHoldIds([]);
      setPaymentProofFile(null);
      setIsUploadDragging(false);
      setModalStep("details");
      setIsPaymentModalOpen(false);
    } catch {
      setStatusMessage("We could not load that day's schedule yet.");
    } finally {
      setIsDateNavigating(false);
    }
  }

  function redirectToBookTheCourtLogin() {
    saveReservationResumeState({
      selectedDate: currentSnapshot.selectedDate,
      selectedSlots,
      formState,
    });

    const returnTo = `/?resumeReservation=1`;
    router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`, {
      scroll: false,
    });
  }

  async function signOutReservationAccount() {
    if (!supabase) {
      setAuthState(null);
      setAuthMode("guest");
      return;
    }

    await supabase.auth.signOut();
    setAuthState(null);
    setAuthMode("guest");
    setAuthStatusMessage("You can continue as a guest.");
  }

  function toggleSlot(slot: SelectedSlot) {
    if (hasActiveHold) {
      setStatusMessage(
        "Finish or release your current hold before changing slots.",
      );
      return;
    }

    setSelectedSlots((current) => {
      const exists = current.some(
        (item) =>
          item.courtId === slot.courtId && item.startTime === slot.startTime,
      );

      if (exists) {
        return current.filter(
          (item) =>
            !(
              item.courtId === slot.courtId && item.startTime === slot.startTime
            ),
        );
      }

      return [...current, slot];
    });
    setStatusMessage("");
  }

  function stepSelectedDate(offsetDays: number) {
    const nextDate = shiftDateKey(currentSnapshot.selectedDate, offsetDays);

    if (
      nextDate < minSelectableDate ||
      (maxSelectableDate !== null && nextDate > maxSelectableDate)
    ) {
      return;
    }

    void changeSelectedDate(nextDate);
  }

  async function releaseSelection(options?: {
    silent?: boolean;
    reason?: "expired" | "manual";
  }) {
    if (activeHoldIds.length > 0) {
      try {
        await fetch("/api/booking-holds", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ holdIds: activeHoldIds }),
        });
      } catch {
        if (!options?.silent) {
          setStatusMessage(
            "We could not release the held slots. Please try again.",
          );
          return;
        }
      }
    }

    setBookings((current) =>
      removeBookingSlotsBySelection(current, selectedSlots),
    );
    setSelectedSlots([]);
    setHoldExpiresAt(null);
    setActiveHoldIds([]);
    setPaymentProofFile(null);
    setIsUploadDragging(false);
    setModalStep("details");
    setIsPaymentModalOpen(false);
    setStatusMessage(
      options?.reason === "expired"
        ? "Your hold expired, so the selected slots were released."
        : "Selection released.",
    );
  }

  useEffect(() => {
    if (!hasActiveHold && activeHoldIds.length > 0) {
      const releaseExpiredHold = async () => {
        try {
          await fetch("/api/booking-holds", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ holdIds: activeHoldIds }),
          });
        } catch {}

        setBookings((current) =>
          removeBookingSlotsBySelection(current, selectedSlots),
        );
        setSelectedSlots([]);
        setHoldExpiresAt(null);
        setActiveHoldIds([]);
        setPaymentProofFile(null);
        setModalStep("details");
        setIsPaymentModalOpen(false);
        setStatusMessage(
          "Your hold expired, so the selected slots were released.",
        );
      };

      releaseExpiredHold().catch(() => {
        setStatusMessage(
          "Your hold expired, so the selected slots were released.",
        );
      });
    }
  }, [activeHoldIds, hasActiveHold, selectedSlots]);

  function continueToPayment() {
    if (selectedSlots.length === 0) {
      setStatusMessage("Select at least one available slot to continue.");
      return;
    }

    setIsPaymentModalOpen(true);
    setModalStep("details");
    setStatusMessage("");
  }

  function handleManualRelease() {
    releaseSelection({ reason: "manual" }).catch(() => {
      setStatusMessage("We could not release the held slots. Please try again.");
    });
  }

  function handleContinueToPayment() {
    continueToPayment();
  }

  function updateField<K extends keyof BookingFormState>(
    key: K,
    value: BookingFormState[K],
  ) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  async function continueToPaymentStep() {
    setStatusMessage("");

    if (authMode === "login" && !authState) {
      setStatusMessage("Sign in first or continue as a guest.");
      return;
    }

    if (!formState.reservationName.trim()) {
      setStatusMessage("Please add the reservation name before continuing.");
      return;
    }

    if (!hasAcceptedPolicies) {
      setStatusMessage(
        "Please review and accept all booking policies before continuing.",
      );
      return;
    }

    if (activeHoldIds.length > 0 && hasActiveHold) {
      setModalStep("payment");
      setStatusMessage("");
      return;
    }

    setIsHoldPending(true);

    try {
      const response = await fetch("/api/booking-holds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playDate: currentSnapshot.selectedDate,
          reservationName: formState.reservationName,
          authAccessToken: authState?.accessToken ?? "",
          selectedBlocks: groupedBlocks.map((block) => ({
            courtId: block.courtId,
            startTime: block.startTime,
            endTime: block.endTime,
            hourlyRatePhp: block.rate,
          })),
        }),
      });

      const result = (await response.json()) as {
        message?: string;
        error?: string;
        holdExpiresAt?: string;
        bookings?: Array<BookingSlot & { id: string }>;
      };

      if (!response.ok || !result.bookings?.length || !result.holdExpiresAt) {
        setStatusMessage(
          result.error ?? "Unable to place the selected slots on hold.",
        );
        return;
      }

      const heldBookings = result.bookings ?? [];
      setBookings((current) => mergeBookingSlots(current, heldBookings));
      setActiveHoldIds(heldBookings.map((booking) => booking.id));
      setHoldExpiresAt(result.holdExpiresAt);
      setModalStep("payment");
      setStatusMessage(result.message ?? "Selected slots are now on hold.");
    } catch {
      setStatusMessage(
        "Network error. We could not place those slots on hold.",
      );
      return;
    } finally {
      setIsHoldPending(false);
    }

    setModalStep("payment");
    setStatusMessage("");
  }

  function submitBookings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage("");

    if (modalStep !== "payment") {
      void continueToPaymentStep();
      return;
    }

    if (groupedBlocks.length === 0) {
      setStatusMessage("No selected booking blocks were found.");
      return;
    }

    if (!paymentProofFile) {
      setStatusMessage(
        "Please upload your payment screenshot before submitting.",
      );
      return;
    }

    startTransition(async () => {
      try {
        const payload = new FormData();
        payload.set("reservationName", formState.reservationName);
        payload.set("fullName", formState.reservationName);
        payload.set("contactEmail", formState.contactEmail);
        payload.set("contactNumber", formState.contactNumber);
        payload.set("paymentMethod", formState.paymentMethod);
        payload.set("paymentReference", formState.paymentReference);
        payload.set("notes", "");
        payload.set("acceptedTerms", String(formState.acceptedTerms));
        payload.set("authAccessToken", authState?.accessToken ?? "");
        payload.set("playDate", currentSnapshot.selectedDate);
        payload.set(
          "selectedBlocks",
          JSON.stringify(
            groupedBlocks.map((block) => ({
              courtId: block.courtId,
              startTime: block.startTime,
              endTime: block.endTime,
              hourlyRatePhp: block.rate,
            })),
          ),
        );
        payload.set("holdIds", JSON.stringify(activeHoldIds));
        payload.set("paymentProof", paymentProofFile);

        const response = await fetch("/api/booking-requests", {
          method: "POST",
          body: payload,
        });

        const result = (await response.json()) as {
          message?: string;
          error?: string;
          bookings?: BookingSlot[];
        };

        if (!response.ok) {
          setStatusMessage(
            result.error ?? "We could not save the booking request.",
          );
          return;
        }

        if (result.bookings?.length) {
          setBookings((current) =>
            mergeBookingSlots(
              removeBookingSlotsBySelection(current, selectedSlots),
              result.bookings ?? [],
            ),
          );
        }

        setStatusMessage(result.message ?? "Booking request saved.");
        setSelectedSlots([]);
        setFormState(initialFormState);
        setHoldExpiresAt(null);
        setActiveHoldIds([]);
        setPaymentProofFile(null);
        setIsUploadDragging(false);
        setIsPaymentModalOpen(false);
        setModalStep("details");
      } catch {
        setStatusMessage("Network error. Please try again.");
      }
    });
  }

  const selectedCourtIds = new Set(
    selectedSlots.map((slot) =>
      getSelectedSlotKey(slot.courtId, slot.startTime),
    ),
  );
  const shouldShowCheckoutBar =
    (groupedBlocks.length > 0 || hasActiveHold) && !isPaymentModalOpen;

  return (
    <div
      className={`space-y-5 ${
        shouldShowCheckoutBar
          ? isCompactMobile
            ? "pb-24"
            : "pb-8"
          : "pb-6 sm:pb-0"
      }`}
    >
      <div className="w-full">
        <div className="h-fit w-full min-w-0 max-w-full overflow-hidden rounded-none border-y border-(--color-border) bg-(--color-surface-elevated) shadow-[0_16px_40px_rgba(var(--color-shadow-brand-rgb),0.05)] sm:rounded-[1.8rem] sm:border">
          <div className="border-b border-(--color-border-muted) px-4 py-5 sm:px-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-text-soft)">
                    Availability
                  </p>
                  <h3 className="mt-1 font-serif text-[1.6rem] leading-none tracking-[-0.03em] text-(--color-text-primary) sm:text-[1.75rem]">
                    {formatHeroDate(currentSnapshot.selectedDate)}
                  </h3>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-(--color-text-muted)">
                    <span className="uppercase tracking-[0.16em] text-(--color-text-soft)">
                      {formatMonthYear(currentSnapshot.selectedDate)}
                    </span>
                  </div>
                </div>

                <div className="hidden items-center gap-2 sm:flex">
                  <button
                    type="button"
                    onClick={() => stepSelectedDate(-1)}
                    disabled={
                      isDateNavigating ||
                      currentSnapshot.selectedDate <= minSelectableDate
                    }
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-(--color-border-muted) bg-(--color-surface) text-lg text-(--color-text-muted) transition hover:border-(--color-brand-success-border) hover:text-(--color-text-primary)"
                    aria-label="Show previous dates"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => stepSelectedDate(1)}
                    disabled={
                      isDateNavigating ||
                      maxSelectableDate !== null &&
                      currentSnapshot.selectedDate >= maxSelectableDate
                    }
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-(--color-border-muted) bg-(--color-surface) text-lg text-(--color-text-muted) transition hover:border-(--color-brand-success-border) hover:text-(--color-text-primary)"
                    aria-label="Show next dates"
                  >
                    ›
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 border-t border-(--color-border-light) pt-4">
                <label className="flex min-w-0 flex-1 items-center gap-3 rounded-[1rem] border border-(--color-border-subtle) bg-(--color-surface-elevated) px-4 py-3 text-sm text-(--color-text-muted) shadow-[0_10px_24px_rgba(var(--color-shadow-brand-rgb),0.04)]">
                  <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-(--color-text-muted)">
                    Play date
                  </span>
                  <input
                    type="date"
                    value={currentSnapshot.selectedDate}
                    min={minSelectableDate}
                    max={maxSelectableDate ?? undefined}
                    disabled={isDateNavigating}
                    onChange={(event) =>
                      void changeSelectedDate(event.target.value)
                    }
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-(--color-brand-strong) outline-none [color-scheme:light]"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => stepSelectedDate(-1)}
                  disabled={
                    isDateNavigating ||
                    currentSnapshot.selectedDate <= minSelectableDate
                  }
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-(--color-border-muted) bg-(--color-surface) text-lg text-(--color-text-muted) transition hover:border-(--color-brand-success-border) hover:text-(--color-text-primary) disabled:opacity-50"
                  aria-label="Show previous date"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => stepSelectedDate(1)}
                  disabled={
                    isDateNavigating ||
                    maxSelectableDate !== null &&
                    currentSnapshot.selectedDate >= maxSelectableDate
                  }
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-(--color-border-muted) bg-(--color-surface) text-lg text-(--color-text-muted) transition hover:border-(--color-brand-success-border) hover:text-(--color-text-primary) disabled:opacity-50"
                  aria-label="Show next date"
                >
                  ›
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-b border-[color:var(--color-border-soft)] bg-[linear-gradient(180deg,rgba(var(--color-shadow-success-rgb),0.08),rgba(var(--color-surface-rgb),0))] px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="xl:visible hidden">
              <p className="text-sm font-medium text-[color:var(--color-text-secondary)]">
                Real-time availability across active courts.
              </p>
              <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">
                Vibrant slots are live and bookable. Muted cells are held,
                pending verification, already booked, or outside operating
                hours.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-[color:var(--color-border-subtle)] bg-[rgba(var(--color-surface-rgb),0.84)] px-3 py-2 text-sm text-[color:var(--color-text-muted)] shadow-[0_8px_24px_rgba(var(--color-shadow-rgb),0.04)]">
              <span className="h-2 w-2 rounded-full bg-[color:var(--color-brand-success)]" />
              Prices updated live
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-[color:var(--color-border-muted)] bg-[rgba(var(--color-surface-rgb),0.62)] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-text-muted)] sm:px-6">
            <span className="rounded-full border border-[color:var(--color-brand-success-border)] bg-[color:var(--color-surface-success)] px-3 py-1 text-[color:var(--color-brand-success)]">
              Available
            </span>
            <span className="rounded-full border border-[color:var(--color-brand-success-border)] bg-[color:var(--color-surface-success-strong)] px-3 py-1 text-[color:var(--color-brand-success-deep)]">
              On Hold
            </span>
            <span className="rounded-full border border-[color:var(--color-border-warning-strong)] bg-[color:var(--color-surface-warning)] px-3 py-1 text-[color:var(--color-warning)]">
              Pending
            </span>
            <span className="rounded-full border border-[color:var(--color-border-danger)] bg-[color:var(--color-surface-danger)] px-3 py-1 text-[color:var(--color-danger-strong)]">
              Booked
            </span>
            <span className="rounded-full border border-[color:var(--color-border-neutral-100)] bg-[repeating-linear-gradient(-45deg,color-mix(in srgb,var(--color-surface) 92%, transparent),color-mix(in srgb,var(--color-surface) 92%, transparent)_10px,color-mix(in srgb,var(--color-surface-soft) 92%, transparent)_10px,color-mix(in srgb,var(--color-surface-soft) 92%, transparent)_20px)] px-3 py-1 text-[color:var(--color-text-muted)]">
              Unavailable / Closed
            </span>
          </div>

          <div className="px-2 py-4 sm:px-6">
            <div className="relative">
              {isDateNavigating ? (
                <div className="absolute inset-0 z-30 flex items-center justify-center rounded-[1.35rem] bg-[color:var(--color-surface-overlay-strong)] backdrop-blur-[2px]">
                  <div className="rounded-[1.25rem] border border-[color:var(--color-border-soft)] bg-[rgba(var(--color-surface-rgb),0.96)] px-5 py-4 text-center shadow-[0_18px_40px_rgba(var(--color-shadow-rgb),0.10)]">
                    <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[color:var(--color-border-subtle)] border-t-[color:var(--color-brand-strong)]" />
                    <p className="mt-3 text-sm font-semibold text-[color:var(--color-text-primary)]">
                      Loading schedule
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                      Fetching availability for the selected date.
                    </p>
                  </div>
                </div>
              ) : null}

              {isCompactMobile ? (
                <div
                  className={`daily-grid-wrap transition-opacity ${
                    isDateNavigating ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  <div
                    className="daily-grid"
                    style={{
                      gridTemplateColumns: `82px repeat(${Math.max(effectiveSnapshot.courts.length, 1)}, minmax(106px, 106px))`,
                    }}
                  >
                    <div className="daily-grid-time-header" />
                    {effectiveSnapshot.courts.map((court) => (
                      <div key={court.id} className="daily-grid-court-header">
                        <p className="text-sm font-semibold text-[color:var(--color-text-primary)]">
                          {court.name}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-text-soft)]">
                          Court
                        </p>
                      </div>
                    ))}

                    {scheduleRows.map((row, rowIndex) => (
                      <div
                        className="contents"
                        key={`${row.startTime}-${row.endTime}-${rowIndex}`}
                      >
                        <div className="daily-grid-time-cell">
                          <p>
                            {formatHeaderTimeRange(row.startTime, row.endTime)}
                          </p>
                          {hasMounted &&
                          isCurrentTimeSlot(
                            currentSnapshot.selectedDate,
                            row.startTime,
                          ) ? (
                            <span className="mt-1 inline-flex rounded-full bg-[color:var(--color-surface-accent)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[color:var(--color-brand-success-deep)]">
                              Now
                            </span>
                          ) : null}
                        </div>

                        {effectiveSnapshot.courts.map((court) => {
                          const courtSlot = row.courts.find(
                            (entry) => entry.courtId === court.id,
                          );

                          if (!courtSlot) {
                            return (
                              <div
                                key={`${court.id}-${row.startTime}-${row.endTime}-${rowIndex}`}
                                className="daily-grid-cell"
                              />
                            );
                          }

                          const slotKey = `${courtSlot.courtId}-${row.startTime}-${row.endTime}-${rowIndex}`;
                          const selectedSlotKey = getSelectedSlotKey(
                            courtSlot.courtId,
                            row.startTime,
                          );
                          const isSelected =
                            selectedCourtIds.has(selectedSlotKey);
                          const isHeldSelection =
                            hasActiveHold && isSelected;
                          const selectedSlot = {
                            courtId: courtSlot.courtId,
                            courtName: courtSlot.courtName,
                            startTime: row.startTime,
                            endTime: row.endTime,
                            startMinuteOffset: row.startMinuteOffset,
                            endMinuteOffset: row.endMinuteOffset,
                            timeLabel: row.timeLabel,
                            rate: courtSlot.hourlyRatePhp,
                          };

                          return (
                            <div key={slotKey} className="daily-grid-cell">
                              {courtSlot.status === "available" &&
                              !isHeldSelection ? (
                                <button
                                  type="button"
                                  onClick={() => toggleSlot(selectedSlot)}
                                  aria-pressed={isSelected}
                                  className={`relative flex h-full min-h-[58px] w-full flex-col items-center justify-center overflow-hidden rounded-[0.8rem] border px-1 text-center transition-all duration-200 ${
                                    isSelected
                                      ? "border-(--color-brand-success-strong) bg-[image:var(--gradient-surface-success)] text-(--color-brand-success-deep) shadow-[0_14px_34px_rgba(var(--color-shadow-success-rgb),0.22)] ring-2 ring-(--color-brand-success-ring) ring-offset-2 ring-offset-(--color-surface)"
                                      : "border-(--color-brand-success-border) bg-[image:var(--gradient-surface-success-soft)] text-(--color-brand-success-strong) hover:border-(--color-brand-success-hover) hover:shadow-[0_10px_24px_rgba(var(--color-shadow-success-rgb),0.10)]"
                                  }`}
                                >
                                  {isSelected ? (
                                    <span className="absolute inset-x-0 top-0 h-1.5 bg-(--color-brand-success-strong)" />
                                  ) : null}
                                  <span className="text-[13px] font-bold">
                                    {formatCompactSlotPrice(
                                      courtSlot.hourlyRatePhp,
                                    )}
                                  </span>
                                  <span
                                    className={`mt-1 text-[10px] font-semibold ${isSelected ? "text-(--color-brand-success-deep)" : "text-(--color-brand-success-muted)"}`}
                                  >
                                    {isSelected ? "Selected" : "Available"}
                                  </span>
                                </button>
                              ) : (
                                <div
                                  className={`flex h-full min-h-[58px] w-full flex-col items-center justify-center rounded-[0.8rem] border px-1 text-center ${getSlotStatusClasses(
                                    isHeldSelection ? "hold" : courtSlot.status,
                                  )}`}
                                >
                                  <span className="line-clamp-2 text-[10px] font-semibold">
                                    {getSlotDisplayLabel(
                                      isHeldSelection ? "hold" : courtSlot.status,
                                      isHeldSelection
                                        ? formState.reservationName || courtSlot.label
                                        : courtSlot.label,
                                    )}
                                  </span>
                                  <span className="mt-1 text-[9px] font-medium opacity-80">
                                    {getSlotStatusDetail(
                                      isHeldSelection ? "hold" : courtSlot.status,
                                      isHeldSelection
                                        ? formState.reservationName || courtSlot.label
                                        : courtSlot.label,
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  className={`booking-matrix-wrap transition-opacity ${
                    isDateNavigating ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  <div
                    className="booking-matrix"
                    style={{
                      gridTemplateColumns: `190px repeat(${Math.max(scheduleRows.length, 1)}, minmax(128px, 128px))`,
                    }}
                  >
                    <div className="booking-matrix-corner" />
                    {scheduleRows.map((row, rowIndex) => (
                      <div
                        key={`${row.startTime}-${row.endTime}-${rowIndex}`}
                        className="booking-matrix-time-header"
                      >
                        <span>
                          {formatHeaderTimeRange(row.startTime, row.endTime)}
                        </span>
                        {hasMounted &&
                        isCurrentTimeSlot(
                          currentSnapshot.selectedDate,
                          row.startTime,
                        ) ? (
                          <span className="mt-1 inline-flex rounded-full bg-(--color-surface-accent) px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-(--color-brand-success-deep)">
                            Now
                          </span>
                        ) : null}
                      </div>
                    ))}

                    {effectiveSnapshot.courts.map((court) => (
                      <div className="contents" key={court.id}>
                        <div className="booking-matrix-court-cell">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-(--color-border-subtle) bg-(--color-surface-soft) text-(--color-text-muted)">
                            <span className="text-base">⌗</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-lg font-semibold text-(--color-text-primary)">
                              {court.name}
                            </p>
                            <p className="text-sm text-(--color-text-muted)">
                              Court schedule
                            </p>
                          </div>
                        </div>

                        {scheduleRows.map((row, rowIndex) => {
                          const courtSlot = row.courts.find(
                            (entry) => entry.courtId === court.id,
                          );

                          if (!courtSlot) {
                            return (
                              <div
                                key={`${court.id}-${row.startTime}-${row.endTime}-${rowIndex}`}
                                className="booking-matrix-slot-cell"
                              />
                            );
                          }

                          const slotKey = `${courtSlot.courtId}-${row.startTime}-${row.endTime}-${rowIndex}`;
                          const selectedSlotKey = getSelectedSlotKey(
                            courtSlot.courtId,
                            row.startTime,
                          );
                          const isSelected =
                            selectedCourtIds.has(selectedSlotKey);
                          const isHeldSelection =
                            hasActiveHold && isSelected;
                          const selectedSlot = {
                            courtId: courtSlot.courtId,
                            courtName: courtSlot.courtName,
                            startTime: row.startTime,
                            endTime: row.endTime,
                            startMinuteOffset: row.startMinuteOffset,
                            endMinuteOffset: row.endMinuteOffset,
                            timeLabel: row.timeLabel,
                            rate: courtSlot.hourlyRatePhp,
                          };

                          return (
                            <div
                              key={slotKey}
                              className="booking-matrix-slot-cell"
                            >
                              {courtSlot.status === "available" &&
                              !isHeldSelection ? (
                                <button
                                  type="button"
                                  onClick={() => toggleSlot(selectedSlot)}
                                  aria-pressed={isSelected}
                                  className={`relative flex h-full min-h-[72px] w-full flex-col items-center justify-center overflow-hidden rounded-[0.95rem] border px-2 text-center transition-all duration-200 ${
                                    isSelected
                                      ? "border-(--color-brand-success-strong) bg-[image:var(--gradient-surface-success)] text-(--color-brand-success-deep) shadow-[0_18px_38px_rgba(var(--color-shadow-success-rgb),0.22)] ring-2 ring-(--color-brand-success-ring) ring-offset-2 ring-offset-(--color-surface)"
                                      : "border-(--color-brand-success-border) bg-[image:var(--gradient-surface-success-soft)] text-(--color-brand-success-strong) hover:border-(--color-brand-success-hover) hover:shadow-[0_10px_24px_rgba(var(--color-shadow-success-rgb),0.10)]"
                                  }`}
                                >
                                  {isSelected ? (
                                    <span className="absolute inset-x-0 top-0 h-2 bg-(--color-brand-success-strong)" />
                                  ) : null}
                                  <span className="text-lg font-bold">
                                    {formatCompactSlotPrice(
                                      courtSlot.hourlyRatePhp,
                                    )}
                                  </span>
                                  <span
                                    className={`mt-1 text-xs font-semibold ${isSelected ? "text-(--color-brand-success-deep)" : "text-(--color-brand-success-muted)"}`}
                                  >
                                    {isSelected ? "Selected" : "Available"}
                                  </span>
                                </button>
                              ) : (
                                <div
                                  className={`flex h-full min-h-[72px] w-full flex-col items-center justify-center rounded-[0.95rem] border px-2 text-center ${getSlotStatusClasses(
                                    isHeldSelection ? "hold" : courtSlot.status,
                                  )}`}
                                >
                                  <span className="line-clamp-2 text-sm font-semibold">
                                    {getSlotDisplayLabel(
                                      isHeldSelection ? "hold" : courtSlot.status,
                                      isHeldSelection
                                        ? formState.reservationName || courtSlot.label
                                        : courtSlot.label,
                                    )}
                                  </span>
                                  <span className="mt-1 text-[11px] font-medium opacity-80">
                                    {getSlotStatusDetail(
                                      isHeldSelection ? "hold" : courtSlot.status,
                                      isHeldSelection
                                        ? formState.reservationName || courtSlot.label
                                        : courtSlot.label,
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {shouldShowCheckoutBar ? (
        <BodyPortal>
          <div className="fixed inset-x-0 bottom-0 z-[1400] border-t border-(--color-border-soft) bg-[linear-gradient(90deg,rgba(var(--color-surface-rgb),0.98),rgba(var(--color-surface-elevated-rgb,var(--color-surface-rgb)),0.96))] px-4 py-4 shadow-[0_-18px_50px_rgba(var(--color-shadow-rgb),0.12)] backdrop-blur-md sm:px-6">
            <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-3">
              <div className="flex items-center justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-(--color-text-soft)">
                      {groupedBlocks.length} selection
                      {groupedBlocks.length === 1 ? "" : "s"}
                    </p>
                    {hasActiveHold ? (
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-(--color-brand-success-deep)">
                        Hold {holdCountdown.label}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-2xl font-bold leading-none text-(--color-text-primary) sm:text-[3rem]">
                    {formatCurrency(subtotal)}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                  <button
                    type="button"
                    onClick={handleManualRelease}
                    disabled={isHoldPending || groupedBlocks.length === 0}
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-(--color-border-soft) bg-[rgba(var(--color-surface-rgb),0.5)] px-5 py-3 text-sm font-semibold text-(--color-text-secondary) transition hover:bg-(--color-surface-soft) disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-14 sm:px-7 sm:text-base"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    disabled={isHoldPending || groupedBlocks.length === 0}
                    onClick={handleContinueToPayment}
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-(--color-action-secondary) px-7 py-3 text-base font-bold text-white shadow-[0_16px_32px_rgba(var(--color-shadow-brand-rgb),0.18)] transition hover:bg-(--color-action-secondary-hover) disabled:cursor-not-allowed disabled:bg-(--color-border-panel) disabled:text-(--color-text-soft) disabled:shadow-none sm:min-h-14 sm:px-10 sm:text-[1.05rem]"
                  >
                    {isCompactMobile
                      ? getMobileCheckoutButtonLabel(
                          isHoldPending,
                          hasActiveHold,
                        )
                      : getCheckoutButtonLabel(isHoldPending, hasActiveHold)}
                  </button>
                </div>
              </div>

              {statusMessage ? (
                <p
                  className={`text-sm ${
                    isErrorStatusMessage(statusMessage)
                      ? "font-semibold text-(--color-danger-strong)"
                      : "text-(--color-text-secondary)"
                  }`}
                >
                  {statusMessage}
                </p>
              ) : null}
            </div>
          </div>
        </BodyPortal>
      ) : null}

      {isPaymentModalOpen ? (
        <BodyPortal>
          <div className="fixed inset-0 z-[1500] flex items-center justify-center overscroll-contain bg-[rgba(var(--color-overlay-rgb),0.42)] p-3 backdrop-blur-sm sm:p-4">
            <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden overscroll-contain rounded-[2rem] border border-(--color-border-panel) bg-(--color-surface-warm) shadow-[0_30px_120px_rgba(var(--color-shadow-rgb),0.18)]">
              <div className="sticky top-0 z-20 flex items-start justify-between border-b border-(--color-border-panel) bg-(--color-surface-warm) px-5 py-5 sm:px-6 sm:py-6">
                <div>
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-(--color-text-primary) sm:text-2xl">
                    {getModalTitle(modalStep)}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-(--color-text-muted)">
                    {getModalDescription(modalStep)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close booking modal"
                  onClick={closePaymentModal}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-(--color-border-panel) bg-[rgba(var(--color-surface-rgb),0.82)] text-xl leading-none text-(--color-text-muted) transition hover:border-(--color-border-panel-soft) hover:text-(--color-text-primary)"
                >
                  ×
                </button>
              </div>

              <form
                ref={paymentModalScrollRef}
                className="min-h-0 flex-1 overflow-y-auto"
                onSubmit={submitBookings}
              >
                <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_340px]">
                <div className="border-b border-(--color-border-panel) px-5 py-5 md:border-b-0 md:border-r md:px-6 md:py-6">
                  <div className="space-y-8">
                    <div className="flex flex-col gap-4 border-b border-(--color-border-panel) pb-5 sm:flex-row sm:items-end sm:justify-between">
                      <div className="flex min-w-0 items-center gap-6">
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-semibold tracking-[-0.02em] ${
                              modalStep === "details"
                                ? "text-(--color-text-primary)"
                                : "text-(--color-text-soft)"
                            }`}
                          >
                            1. Reservation Details
                          </p>
                          <div
                            className={`mt-3 h-1 rounded-full transition ${
                              modalStep === "details"
                                ? "bg-(--color-action-primary)"
                                : "bg-(--color-border-panel)"
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-semibold tracking-[-0.02em] ${
                              modalStep === "payment"
                                ? "text-(--color-text-primary)"
                                : "text-(--color-text-soft)"
                            }`}
                          >
                            2. Payment Proof
                          </p>
                          <div
                            className={`mt-3 h-1 rounded-full transition ${
                              modalStep === "payment"
                                ? "bg-(--color-action-primary)"
                                : "bg-(--color-border-panel)"
                            }`}
                          />
                        </div>
                      </div>

                      {hasActiveHold ? (
                        <span className="inline-flex w-fit items-center rounded-full bg-(--color-surface-danger-soft) px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-(--color-danger)">
                          Hold {holdCountdown.label}
                        </span>
                      ) : null}
                    </div>

                    {modalStep === "details" ? (
                      <>
                        <section className="rounded-[1.25rem] border border-[color:var(--color-border-panel)] bg-[rgba(var(--color-surface-rgb),0.58)] p-4 sm:p-5">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setAuthMode("guest");
                                setAuthStatusMessage("");
                              }}
                              className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                                authMode === "guest"
                                  ? "bg-[color:var(--color-action-primary)] text-white"
                                  : "border border-[color:var(--color-border-soft)] bg-[rgba(var(--color-surface-rgb),0.8)] text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]"
                              }`}
                            >
                              Book as Guest
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAuthMode("login");
                                setAuthStatusMessage("");
                              }}
                              className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                                authMode === "login"
                                  ? "bg-[color:var(--color-action-primary)] text-white"
                                  : "border border-[color:var(--color-border-soft)] bg-[rgba(var(--color-surface-rgb),0.8)] text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]"
                              }`}
                            >
                              Login with BookTheCourt
                            </button>
                          </div>

                          {authMode === "login" ? (
                            authState ? (
                              <div className="mt-4 rounded-xl border border-[color:var(--color-border-light)] bg-[color:var(--color-surface-soft)] px-4 py-4">
                                <p className="text-sm font-semibold text-[color:var(--color-text-primary)]">
                                  Signed in as {authState.email}
                                </p>
                                <p className="mt-1 text-sm leading-6 text-[color:var(--color-text-muted)]">
                                  We&apos;ll use your BookTheCourt account for
                                  this reservation, and you can still finish the
                                  booking from this guest-facing flow.
                                </p>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void signOutReservationAccount()
                                  }
                                  className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full border border-[color:var(--color-border-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--color-text-secondary)] transition hover:border-[color:var(--color-brand)] hover:text-[color:var(--color-brand)]"
                                >
                                  Use guest checkout instead
                                </button>
                              </div>
                            ) : (
                              <div className="mt-4 rounded-xl border border-[color:var(--color-border-light)] bg-[color:var(--color-surface-soft)] px-4 py-4">
                                <p className="text-sm leading-6 text-[color:var(--color-text-muted)]">
                                  Continue to the dedicated BookTheCourt login
                                  page. After signing in, we&apos;ll bring you
                                  back here and restore your selected session.
                                </p>
                                <button
                                  type="button"
                                  onClick={redirectToBookTheCourtLogin}
                                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-[color:var(--color-brand-strong)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--color-brand-strong-hover)]"
                                >
                                  Open BookTheCourt Login
                                </button>
                              </div>
                            )
                          ) : (
                            <p className="mt-4 text-sm leading-6 text-[color:var(--color-text-muted)]">
                              No account is required. You can continue as a
                              guest and submit your reservation normally.
                            </p>
                          )}

                          {authStatusMessage ? (
                            <div className="mt-4 rounded-xl border border-[color:var(--color-border-light)] bg-[color:var(--color-surface-soft)] px-4 py-3 text-sm text-[color:var(--color-text-secondary)]">
                              {authStatusMessage}
                            </div>
                          ) : null}
                        </section>

                        <div className="grid gap-5">
                          <label className="grid gap-2 text-sm font-medium text-[color:var(--color-text-secondary)]">
                            Reservation name
                            <input
                              value={formState.reservationName}
                              onChange={(event) =>
                                updateField(
                                  "reservationName",
                                  event.target.value,
                                )
                              }
                              placeholder="e.g. Juan Dela Cruz"
                              className="h-12 rounded-lg border border-[color:var(--color-border-panel)] bg-[rgba(var(--color-surface-rgb),0.82)] px-4 text-[color:var(--color-text-primary)] outline-none transition placeholder:text-[color:var(--color-text-soft)] focus:border-[color:var(--color-action-primary)] focus:ring-2 focus:ring-[color:var(--color-action-info-soft)]"
                            />
                          </label>

                          <div className="grid gap-5 xl:grid-cols-2">
                            <label className="grid gap-2 text-sm font-medium text-[color:var(--color-text-secondary)]">
                              Contact email
                              <input
                                type="email"
                                value={formState.contactEmail}
                                onChange={(event) =>
                                  updateField(
                                    "contactEmail",
                                    event.target.value,
                                  )
                                }
                                placeholder="juan@email.com"
                                readOnly={Boolean(authState?.email)}
                                className="h-12 rounded-lg border border-[color:var(--color-border-panel)] bg-[rgba(var(--color-surface-rgb),0.82)] px-4 text-[color:var(--color-text-primary)] outline-none transition placeholder:text-[color:var(--color-text-soft)] focus:border-[color:var(--color-action-primary)] focus:ring-2 focus:ring-[color:var(--color-action-info-soft)]"
                              />
                            </label>

                            <label className="grid gap-2 text-sm font-medium text-[color:var(--color-text-secondary)]">
                              Contact number
                              <input
                                value={formState.contactNumber}
                                onChange={(event) =>
                                  updateField(
                                    "contactNumber",
                                    event.target.value,
                                  )
                                }
                                placeholder="09XX XXX XXXX"
                                className="h-12 rounded-lg border border-[color:var(--color-border-panel)] bg-[rgba(var(--color-surface-rgb),0.82)] px-4 text-[color:var(--color-text-primary)] outline-none transition placeholder:text-[color:var(--color-text-soft)] focus:border-[color:var(--color-action-primary)] focus:ring-2 focus:ring-[color:var(--color-action-info-soft)]"
                              />
                            </label>
                          </div>
                        </div>

                        <p className="text-sm leading-6 text-[color:var(--color-text-muted)]">
                          Provide at least one contact detail so the facility
                          can send your booking confirmation.
                        </p>

                        <section className="border-t border-[color:var(--color-border-panel)] pt-6">
                          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--color-text-soft)]">
                            Booking Policies & Waiver
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[color:var(--color-text-muted)]">
                            Please review and confirm these policies before you
                            continue to payment.
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              setShowPolicyDetails((current) => !current)
                            }
                            className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-[color:var(--color-border-panel)] bg-[rgba(var(--color-surface-rgb),0.82)] px-4 py-3 text-sm font-semibold text-[color:var(--color-text-primary)] transition hover:border-[color:var(--color-border-panel-soft)] hover:bg-[rgba(var(--color-surface-rgb),0.92)]"
                          >
                            {showPolicyDetails
                              ? "Hide refund, cancellation, and waiver details"
                              : "View refund, cancellation, and waiver details"}
                          </button>

                          {showPolicyDetails ? (
                            <div className="mt-4 rounded-lg border border-[color:var(--color-border-panel)] bg-[rgba(var(--color-surface-rgb),0.82)] px-4 py-4 text-sm leading-6 text-[color:var(--color-text-secondary)]">
                              <p>
                                Bookings are confirmed only after payment
                                verification by the venue.
                              </p>
                              <p className="mt-2">
                                Rescheduling is subject to venue approval and
                                available schedule.
                              </p>
                              <p className="mt-2">
                                Convenience and processing fees, when charged,
                                are non-refundable.
                              </p>
                            </div>
                          ) : null}

                          <div className="mt-5 space-y-3">
                            <label className="flex items-start gap-3 rounded-lg border border-[color:var(--color-border-panel)] bg-[rgba(var(--color-surface-rgb),0.82)] px-4 py-4 text-sm text-[color:var(--color-text-secondary)]">
                              <input
                                type="checkbox"
                                checked={formState.acceptedTerms}
                                onChange={(event) =>
                                  updateField(
                                    "acceptedTerms",
                                    event.target.checked,
                                  )
                                }
                                className="mt-1 h-4 w-4 rounded border-[color:var(--color-border-panel-muted)] text-[color:var(--color-action-secondary)]"
                              />
                              <span>
                                I have read the{" "}
                                <span className="font-semibold text-[color:var(--color-action-primary)]">
                                  Terms and Conditions
                                </span>{" "}
                                and the waiver policy.
                              </span>
                            </label>

                            <label className="flex items-start gap-3 rounded-lg border border-[color:var(--color-border-panel)] bg-[rgba(var(--color-surface-rgb),0.82)] px-4 py-4 text-sm text-[color:var(--color-text-secondary)]">
                              <input
                                type="checkbox"
                                checked={formState.acceptedProceed}
                                onChange={(event) =>
                                  updateField(
                                    "acceptedProceed",
                                    event.target.checked,
                                  )
                                }
                                className="mt-1 h-4 w-4 rounded border-[color:var(--color-border-panel-muted)] text-[color:var(--color-action-secondary)]"
                              />
                              <span>
                                I understand and wish to proceed.
                                <span className="mt-1 block text-xs leading-5 text-[color:var(--color-text-muted)]">
                                  Rebooking is allowed only once per booking and
                                  must be requested at least 3 days before the
                                  reserved date, subject to available schedule.
                                </span>
                              </span>
                            </label>

                            <label className="flex items-start gap-3 rounded-lg border border-[color:var(--color-border-panel)] bg-[rgba(var(--color-surface-rgb),0.82)] px-4 py-4 text-sm text-[color:var(--color-text-secondary)]">
                              <input
                                type="checkbox"
                                checked={formState.acceptedFeePolicy}
                                onChange={(event) =>
                                  updateField(
                                    "acceptedFeePolicy",
                                    event.target.checked,
                                  )
                                }
                                className="mt-1 h-4 w-4 rounded border-[color:var(--color-border-panel-muted)] text-[color:var(--color-action-secondary)]"
                              />
                              <span>
                                I understand that the convenience fee is
                                non-refundable.
                                <span className="mt-1 block text-xs leading-5 text-[color:var(--color-text-muted)]">
                                  Note: The convenience fee charged during
                                  checkout is non-refundable.
                                </span>
                              </span>
                            </label>
                          </div>
                        </section>
                      </>
                    ) : (
                      <>
                        <div className="grid gap-5 md:grid-cols-2">
                          <label className="grid gap-2 text-sm font-medium text-[color:var(--color-text-secondary)]">
                            Payment method
                            <select
                              value={formState.paymentMethod}
                              onChange={(event) =>
                                updateField("paymentMethod", event.target.value)
                              }
                              className="h-12 rounded-lg border border-[color:var(--color-border-panel)] bg-[rgba(var(--color-surface-rgb),0.82)] px-4 text-[color:var(--color-text-primary)] outline-none transition focus:border-[color:var(--color-action-primary)] focus:ring-2 focus:ring-[color:var(--color-action-info-soft)]"
                            >
                              <option value="gcash">GCash</option>
                              <option value="paymaya">PayMaya</option>
                              <option value="bank">Bank Transfer</option>
                            </select>
                          </label>

                          <label className="grid gap-2 text-sm font-medium text-[color:var(--color-text-secondary)]">
                            Reference ID (optional)
                            <input
                              value={formState.paymentReference}
                              onChange={(event) =>
                                updateField(
                                  "paymentReference",
                                  event.target.value,
                                )
                              }
                              placeholder="Enter your payment reference"
                              className="h-12 rounded-lg border border-[color:var(--color-border-panel)] bg-[rgba(var(--color-surface-rgb),0.82)] px-4 text-[color:var(--color-text-primary)] outline-none transition placeholder:text-[color:var(--color-text-soft)] focus:border-[color:var(--color-action-primary)] focus:ring-2 focus:ring-[color:var(--color-action-info-soft)]"
                            />
                          </label>
                        </div>

                        <div className="grid gap-2 text-sm font-medium text-[color:var(--color-text-secondary)]">
                          <p>Payment screenshot</p>
                          <input
                            id={paymentProofInputId}
                            required
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            onChange={(event) =>
                              updatePaymentProofFile(
                                event.target.files?.[0] ?? null,
                              )
                            }
                            className="sr-only"
                          />
                          <label
                            htmlFor={paymentProofInputId}
                            onDragOver={(event) => {
                              event.preventDefault();
                              setIsUploadDragging(true);
                            }}
                            onDragLeave={() => setIsUploadDragging(false)}
                            onDrop={(event) => {
                              event.preventDefault();
                              updatePaymentProofFile(
                                event.dataTransfer.files?.[0] ?? null,
                              );
                            }}
                            className={`flex min-h-[152px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-[rgba(var(--color-surface-rgb),0.82)] px-6 py-8 text-center transition ${
                              isUploadDragging
                                ? "border-[color:var(--color-action-info-border)] bg-[color:var(--color-surface-info)]"
                                : "border-[color:var(--color-border-panel-soft)]"
                            }`}
                          >
                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--color-surface-info)] text-[color:var(--color-action-primary)]">
                              <svg
                                viewBox="0 0 24 24"
                                className="h-6 w-6"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="M12 16V8" />
                                <path d="m8.5 11.5 3.5-3.5 3.5 3.5" />
                                <path d="M20 16.5a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 4 16.5" />
                              </svg>
                            </span>
                            <span className="mt-4 text-sm font-semibold text-[color:var(--color-text-primary)]">
                              Click to upload screenshot or drag and drop here
                            </span>
                            <span className="mt-2 text-xs text-[color:var(--color-text-muted)]">
                              PNG, JPG, or WEBP up to 10MB
                            </span>
                            {paymentProofFile ? (
                              <span className="mt-4 rounded-full bg-[color:var(--color-surface-info)] px-3 py-1 text-xs font-semibold text-[color:var(--color-action-primary)]">
                                {paymentProofFile.name}
                              </span>
                            ) : null}
                          </label>
                        </div>

                        <div className="border-t border-[color:var(--color-border-panel)] pt-6 text-sm text-[color:var(--color-text-secondary)]">
                          <p className="font-semibold text-[color:var(--color-text-primary)]">
                            How this works
                          </p>
                          <p className="mt-2 leading-6">
                            Upload the screenshot of your payment after sending
                            the amount through{" "}
                            {formState.paymentMethod === "gcash"
                              ? "GCash"
                              : formState.paymentMethod === "paymaya"
                                ? "PayMaya"
                                : "Bank Transfer"}
                            . Your reservation will be marked pending until the
                            venue verifies it.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-[rgba(var(--color-surface-rgb),0.55)] px-5 py-5 md:px-6 md:py-6">
                  <div className="md:sticky md:top-0">
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-[color:var(--color-text-soft)]">
                      Booking Summary
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--color-text-primary)] sm:text-[2rem]">
                      {formatDisplayDate(currentSnapshot.selectedDate)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--color-text-muted)]">
                      {groupedBlocks.length} selected block
                      {groupedBlocks.length === 1 ? "" : "s"} across{" "}
                      {
                        new Set(groupedBlocks.map((block) => block.courtId))
                          .size
                      }{" "}
                      court
                      {new Set(groupedBlocks.map((block) => block.courtId))
                        .size === 1
                        ? ""
                        : "s"}
                      .
                    </p>
                    {modalStep === "details" && hasActiveHold ? (
                      <p className="mt-2 text-sm leading-6 text-[color:var(--color-text-muted)]">
                        These slots are temporarily held while you finish the
                        booking details.
                      </p>
                    ) : null}

                    <div className="mt-6 divide-y divide-[color:var(--color-border-panel)] border-y border-[color:var(--color-border-panel)]">
                      {groupedBlocks.map((block) => (
                        <div
                          key={`${block.courtId}-${block.startTime}`}
                          className="px-0 py-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-base font-semibold text-[color:var(--color-text-primary)] sm:text-lg">
                                {block.courtName}
                              </p>
                              <p className="mt-1 text-sm font-medium text-[color:var(--color-text-secondary)]">
                                {formatTimeLabel(block.startTime)} -{" "}
                                {formatTimeLabel(block.endTime)}
                              </p>
                            </div>
                            <p className="text-base font-semibold text-[color:var(--color-text-primary)] sm:text-lg">
                              {formatCurrency(block.subtotalPhp)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 space-y-4 border-t border-[color:var(--color-border-panel)] pt-5">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm uppercase tracking-[0.16em] text-[color:var(--color-text-soft)]">
                          Court Rental
                        </p>
                        <p className="text-xl font-semibold text-[color:var(--color-text-primary)] sm:text-2xl">
                          {formatCurrency(subtotal)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-t border-[color:var(--color-border-panel)] pt-4">
                        <p className="text-sm text-[color:var(--color-text-muted)]">
                          Service Fee
                        </p>
                        <p className="text-sm font-semibold text-[color:var(--color-text-primary)]">
                          {formatCurrency(0)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-t border-[color:var(--color-border-panel)] pt-4">
                        <p className="text-xl font-semibold text-[color:var(--color-text-primary)] sm:text-2xl">
                          Total
                        </p>
                        <p className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--color-action-primary)] sm:text-3xl">
                          {formatCurrency(subtotal)}
                        </p>
                      </div>
                    </div>

                    <div className="sticky bottom-0 z-10 -mx-5 mt-8 border-t border-[color:var(--color-border-panel)] bg-[color:var(--color-surface-warm)] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-14px_28px_rgba(var(--color-shadow-rgb),0.08)] md:-mx-6 md:px-6">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            modalStep === "payment"
                              ? setModalStep("details")
                              : closePaymentModal()
                          }
                          className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] px-4 py-2.5 text-sm font-semibold text-[color:var(--color-text-secondary)] shadow-[0_8px_24px_rgba(var(--color-shadow-rgb),0.05)] transition hover:border-[color:var(--color-brand-success-border)] hover:text-[color:var(--color-brand-strong)]"
                        >
                          <span
                            aria-hidden="true"
                            className="mr-2 text-base leading-none"
                          >
                            ←
                          </span>
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void releaseSelection({ reason: "manual" })
                          }
                          className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--color-border-danger)] bg-[color:var(--color-surface-danger-soft)] px-4 py-2.5 text-sm font-semibold text-[color:var(--color-danger-strong)] transition hover:bg-[color:var(--color-surface-danger)] hover:text-[color:var(--color-danger)]"
                        >
                          <span
                            aria-hidden="true"
                            className="mr-2 text-base leading-none"
                          >
                            ×
                          </span>
                          Release Hold
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={isPending || isHoldPending}
                        className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[color:var(--color-action-primary)] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(var(--color-shadow-brand-rgb),0.24)] transition hover:bg-[color:var(--color-action-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
                      >
                        {isPending || isHoldPending
                          ? "Saving..."
                          : modalStep === "details"
                            ? "Proceed to Payment"
                            : "Submit Payment Proof"}
                      </button>

                      {statusMessage ? (
                        <div
                          className={`mt-4 rounded-[1rem] border px-4 py-3 text-sm ${
                            isErrorStatusMessage(statusMessage)
                              ? "border-[color:var(--color-border-danger)] bg-[color:var(--color-surface-danger-soft)] font-semibold text-[color:var(--color-danger-strong)]"
                              : "border-[color:var(--color-border-light)] bg-[color:var(--color-surface-soft)] text-[color:var(--color-text-secondary)]"
                          }`}
                        >
                          {statusMessage}
                        </div>
                      ) : hasActiveHold ? (
                        <p className="mt-4 text-sm text-[color:var(--color-text-soft)]">
                          Slots are held for 10 minutes once you proceed to
                          payment.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
                </div>
              </form>
            </div>
          </div>
        </BodyPortal>
      ) : null}
    </div>
  );
}

function BodyPortal({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) {
    return null;
  }

  return createPortal(children, document.body);
}

function groupSelectedSlots(slots: SelectedSlot[]) {
  const byCourt = new Map<string, SelectedSlot[]>();

  for (const slot of slots) {
    const key = `${slot.courtId}::${slot.courtName}`;
    const existing = byCourt.get(key) ?? [];
    existing.push(slot);
    byCourt.set(key, existing);
  }

  const blocks: Array<{
    courtId: string;
    courtName: string;
    startTime: string;
    endTime: string;
    rate: number;
    subtotalPhp: number;
    hours: number;
  }> = [];

  for (const [key, courtSlots] of byCourt.entries()) {
    const [courtId, courtName] = key.split("::");
    const sorted = [...courtSlots].sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    );

    let currentBlockSlots = [sorted[0]];

    for (let index = 1; index < sorted.length; index += 1) {
      const nextSlot = sorted[index];
      const previousSlot = currentBlockSlots[currentBlockSlots.length - 1];
      if (
        nextSlot.startTime === previousSlot.endTime &&
        nextSlot.rate === previousSlot.rate
      ) {
        currentBlockSlots.push(nextSlot);
      } else {
        blocks.push(createBlock(courtId, courtName, currentBlockSlots));
        currentBlockSlots = [nextSlot];
      }
    }

    blocks.push(createBlock(courtId, courtName, currentBlockSlots));
  }

  return blocks.sort((a, b) =>
    `${a.courtName}-${a.startTime}`.localeCompare(
      `${b.courtName}-${b.startTime}`,
    ),
  );
}

function getSelectedSlotKey(courtId: string, startTime: string) {
  return `${courtId}-${startTime}`;
}

async function fetchSignedInProfileDetails(
  supabase: ReturnType<typeof createPublicSupabaseClient>,
  userId: string,
) {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("first_name,last_name,full_name,display_name,contact_number,phone,mobile")
      .eq("id", userId)
      .maybeSingle();

    if (!data || typeof data !== "object") {
      return { reservationName: "", contactNumber: "" };
    }

    const profile = data as Record<string, unknown>;
    const reservationName =
      stringOrEmpty(profile.full_name) ||
      joinNameParts(profile.first_name, profile.last_name) ||
      stringOrEmpty(profile.display_name);
    const contactNumber =
      stringOrEmpty(profile.contact_number) ||
      stringOrEmpty(profile.phone) ||
      stringOrEmpty(profile.mobile);

    return { reservationName, contactNumber };
  } catch {
    return { reservationName: "", contactNumber: "" };
  }
}

function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function joinNameParts(firstName: unknown, lastName: unknown) {
  const parts = [stringOrEmpty(firstName), stringOrEmpty(lastName)].filter(
    Boolean,
  );
  return parts.join(" ").trim();
}

function saveReservationResumeState(state: ReservationResumeState) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    reservationResumeStorageKey,
    JSON.stringify(state),
  );
}

function readReservationResumeState() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(reservationResumeStorageKey);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ReservationResumeState>;
    return {
      selectedDate: String(parsed.selectedDate ?? ""),
      selectedSlots: Array.isArray(parsed.selectedSlots)
        ? parsed.selectedSlots.map((slot) => ({
            courtId: String(slot.courtId ?? ""),
            courtName: String(slot.courtName ?? ""),
            startTime: String(slot.startTime ?? ""),
            endTime: String(slot.endTime ?? ""),
            startMinuteOffset: Number(
              slot.startMinuteOffset ?? timeToMinutes(String(slot.startTime ?? "")),
            ),
            endMinuteOffset: Number(
              slot.endMinuteOffset ?? timeToMinutes(String(slot.endTime ?? "")),
            ),
            timeLabel: String(slot.timeLabel ?? ""),
            rate: Number(slot.rate ?? 0),
          }))
        : [],
      formState: {
        reservationName: String(parsed.formState?.reservationName ?? ""),
        contactEmail: String(parsed.formState?.contactEmail ?? ""),
        contactNumber: String(parsed.formState?.contactNumber ?? ""),
        paymentMethod: String(parsed.formState?.paymentMethod ?? "gcash"),
        paymentReference: String(parsed.formState?.paymentReference ?? ""),
        acceptedTerms: Boolean(parsed.formState?.acceptedTerms),
        acceptedProceed: Boolean(parsed.formState?.acceptedProceed),
        acceptedFeePolicy: Boolean(parsed.formState?.acceptedFeePolicy),
      },
    };
  } catch {
    return null;
  }
}

function clearReservationResumeState() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(reservationResumeStorageKey);
}

function clearResumeReservationQueryParam() {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete("resumeReservation");
  window.history.replaceState(
    {},
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

function filterRestorableSlots(
  slots: SelectedSlot[],
  rows: VenueSnapshot["availabilityRows"],
) {
  const availableKeys = new Set(
    rows.flatMap((row) =>
      row.courts
        .filter((court) => court.status === "available")
        .map((court) => `${court.courtId}-${row.startTime}`),
    ),
  );

  return slots.filter((slot) =>
    availableKeys.has(getSelectedSlotKey(slot.courtId, slot.startTime)),
  );
}

function isErrorStatusMessage(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("please ") ||
    normalized.includes("unable ") ||
    normalized.includes("could not") ||
    normalized.includes("network error") ||
    normalized.includes("no selected") ||
    normalized.includes("finish or release") ||
    normalized.includes("select at least")
  );
}

function createBlock(
  courtId: string,
  courtName: string,
  slots: SelectedSlot[],
) {
  const startSlot = slots[0];
  const endSlot = slots[slots.length - 1];
  const rate = startSlot.rate;
  const subtotalPhp = slots.reduce((sum, slot) => sum + slot.rate, 0);
  const hours = slots.length;

  return {
    courtId,
    courtName,
    startTime: startSlot.startTime,
    endTime: endSlot.endTime,
    rate,
    subtotalPhp,
    hours,
  };
}

function mergeBookingSlots(current: BookingSlot[], incoming: BookingSlot[]) {
  const next = [...current];

  for (const booking of incoming) {
    const existingIndex = next.findIndex(
      (entry) =>
        entry.courtId === booking.courtId &&
        entry.startsAt === booking.startsAt &&
        entry.endsAt === booking.endsAt,
    );

    if (existingIndex >= 0) {
      next[existingIndex] = booking;
    } else {
      next.push(booking);
    }
  }

  return next;
}

function removeBookingSlotsBySelection(
  current: BookingSlot[],
  selectedSlots: SelectedSlot[],
) {
  if (!selectedSlots.length) {
    return current;
  }

  return current.filter((booking) => {
    const bookingStart = timeToMinutes(booking.startsAt);
    const bookingEnd = booking.endMinuteOffset ?? timeToMinutes(booking.endsAt);
    const resolvedBookingStart =
      booking.startMinuteOffset ?? bookingStart;

    return !selectedSlots.some((slot) => {
      if (slot.courtId !== booking.courtId) {
        return false;
      }

      return (
        slot.startMinuteOffset < bookingEnd &&
        slot.endMinuteOffset > resolvedBookingStart
      );
    });
  });
}

function formatDisplayDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatHeroDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatMonthYear(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatHeaderTimeRange(startTime: string, endTime: string) {
  return `${formatShortTimeLabel(startTime)}-${formatShortTimeLabel(endTime)}`;
}

function formatShortTimeLabel(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const twelveHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelveHour}${minutes === 0 ? "" : `:${String(minutes).padStart(2, "0")}`}${suffix}`;
}

function formatTimeLabel(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const twelveHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelveHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function formatCompactSlotPrice(value: number) {
  return `₱${Math.round(value).toLocaleString("en-PH")}`;
}

function getCheckoutButtonLabel(isHoldPending: boolean, hasActiveHold: boolean) {
  if (isHoldPending) {
    return "Holding...";
  }

  if (hasActiveHold) {
    return "Continue Payment";
  }

  return "Checkout";
}

function getMobileCheckoutButtonLabel(
  isHoldPending: boolean,
  hasActiveHold: boolean,
) {
  if (isHoldPending) {
    return "Holding Slots...";
  }

  if (hasActiveHold) {
    return "Continue Payment";
  }

  return "Checkout";
}

function getModalTitle(step: ModalStep) {
  return step === "details" ? "Reserve Court" : "Upload payment proof";
}

function getModalDescription(step: ModalStep) {
  return step === "details"
    ? "Choose your slots, review your details, then proceed to payment."
    : "Attach your payment screenshot, then submit it for venue verification.";
}

function getSlotStatusTitle(
  status: "available" | "unavailable" | "hold" | "pending" | "booked",
  label: string,
) {
  if (status === "hold") {
    return "On Hold";
  }

  if (status === "pending") {
    return "Pending";
  }

  if (status === "booked") {
    return "Booked";
  }

  if (status === "unavailable") {
    return label.toLowerCase().includes("closed") ? "Closed" : "Unavailable";
  }

  return "Available";
}

function getSlotDisplayLabel(
  status: "available" | "unavailable" | "hold" | "pending" | "booked",
  label: string,
) {
  return getSlotStatusTitle(status, label);
}

function getSlotStatusDetail(
  status: "available" | "unavailable" | "hold" | "pending" | "booked",
  label: string,
) {
  if (status === "hold") {
    return "Temporarily held";
  }

  if (status === "pending") {
    return "Awaiting review";
  }

  if (status === "booked") {
    return formatBookedSlotDetail(label);
  }

  if (status === "unavailable") {
    return label.toLowerCase().includes("closed")
      ? "Venue closed"
      : "Not bookable";
  }

  return label;
}

function formatBookedSlotDetail(label: string) {
  const normalizedLabel = label.trim();

  if (!normalizedLabel || normalizedLabel === "Reserved") {
    return "Already booked";
  }

  if (normalizedLabel.toLowerCase().includes("owner reservation")) {
    return "Owner Reservation";
  }

  return abbreviateReservationName(normalizedLabel);
}

function abbreviateReservationName(label: string) {
  const primaryLabel = label.split(/[•|]/)[0]?.trim() ?? label.trim();
  const sanitizedLabel = primaryLabel.replace(/\s*-\s*/g, " ").trim();
  const words = sanitizedLabel.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    const firstWord = toTitleCaseWord(words[0]);
    const lastInitial = words[words.length - 1]?.charAt(0).toUpperCase();

    if (lastInitial) {
      return `${firstWord} ${lastInitial}.`;
    }
  }

  if (sanitizedLabel.length <= 14) {
    return sanitizedLabel;
  }

  return `${sanitizedLabel.slice(0, 13).trimEnd()}…`;
}

function toTitleCaseWord(value: string) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function getSlotStatusClasses(
  status: "available" | "unavailable" | "hold" | "pending" | "booked",
) {
  if (status === "hold") {
    return "border-[color:var(--color-action-info-subtle)] bg-[color:var(--color-surface-info-strong)] text-[color:var(--color-info)]";
  }

  if (status === "pending") {
    return "border-[color:var(--color-border-warning-strong)] bg-[color:var(--color-surface-warning)] text-[color:var(--color-warning)]";
  }

  if (status === "booked") {
    return "border-[color:var(--color-border-danger)] bg-[color:var(--color-surface-danger)] text-[color:var(--color-danger-strong)]";
  }

  return "border-[color:var(--color-border-neutral-100)] bg-[repeating-linear-gradient(-45deg,color-mix(in srgb,var(--color-surface) 92%, transparent),color-mix(in srgb,var(--color-surface) 92%, transparent)_10px,color-mix(in srgb,var(--color-surface-soft) 92%, transparent)_10px,color-mix(in srgb,var(--color-surface-soft) 92%, transparent)_20px)] text-[color:var(--color-text-secondary)]";
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function shiftDateKey(value: string, offsetDays: number) {
  return shiftScheduleDateKey(value, offsetDays);
}

function getTodayDateKey() {
  return getScheduleDateKey(new Date());
}

function isCurrentTimeSlot(selectedDate: string, startTime: string) {
  if (selectedDate !== getTodayDateKey()) {
    return false;
  }

  const minutes = getCurrentMinutesInManila();
  const slotStart = timeToMinutes(startTime);
  const slotEnd = slotStart + 60;

  return minutes >= slotStart && minutes < slotEnd;
}

function getCurrentMinutesInManila() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? "0",
  );
  return hour * 60 + minute;
}

function useHoldCountdown(holdExpiresAt: string | null) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!holdExpiresAt) {
      return;
    }

    const tick = () => setNow(Date.now());
    const timeout = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 1000);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [holdExpiresAt]);

  if (!holdExpiresAt) {
    return { totalSeconds: 0, label: "00:00" };
  }

  const totalSeconds = Math.max(
    0,
    Math.floor((new Date(holdExpiresAt).getTime() - now) / 1000),
  );
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return {
    totalSeconds,
    label: `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
  };
}
