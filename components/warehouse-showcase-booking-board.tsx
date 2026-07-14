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

import { LoadingImage } from "@/components/loading-image";
import {
  formatCurrency,
  getAvailabilityRows,
  type BookingSlot,
  type PaymentOption,
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
  contactNumber: string;
};

type ReservationResumeState = {
  selectedDate: string;
  selectedSlots: SelectedSlot[];
  formState: BookingFormState;
  holdExpiresAt?: string | null;
  activeHoldIds?: string[];
  modalStep?: ModalStep;
  isPaymentModalOpen?: boolean;
};

type ModalStep = "details" | "payment";

type BookingConfirmationState = {
  receiptId: string;
  reservationName: string;
  selectedDate: string;
  blocks: Array<{
    courtId: string;
    courtName: string;
    startTime: string;
    endTime: string;
    subtotalPhp: number;
  }>; 
  totalPhp: number;
};

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
  const [bookings, setBookings] = useState<BookingSlot[]>(() =>
    filterLiveBookingSlots(snapshot.bookings),
  );
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);
  const [formState, setFormState] =
    useState<BookingFormState>(initialFormState);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [activeHoldIds, setActiveHoldIds] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [bookingConfirmation, setBookingConfirmation] =
    useState<BookingConfirmationState | null>(null);
  const [isReceiptPreviewOpen, setIsReceiptPreviewOpen] = useState(false);
  const [isConfirmationDownloading, setIsConfirmationDownloading] =
    useState(false);
  const [confirmationDownloadError, setConfirmationDownloadError] =
    useState("");
  const [modalStep, setModalStep] = useState<ModalStep>("details");
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [showPolicyDetails, setShowPolicyDetails] = useState(false);
  const [isHoldPending, setIsHoldPending] = useState(false);
  const [isDateNavigating, setIsDateNavigating] = useState(false);
  const [isUploadDragging, setIsUploadDragging] = useState(false);
  const [isPaymentMethodSwitching, setIsPaymentMethodSwitching] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("guest");
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [authStatusMessage, setAuthStatusMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const paymentProofInputId = useId();
  const pendingResumeStateRef = useRef<ReservationResumeState | null>(null);
  const paymentModalScrollRef = useRef<HTMLFormElement | null>(null);
  const skipExpiredHoldReleaseRef = useRef(false);

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
  const paymentOptions = useMemo(
    () => getDisplayPaymentOptions(currentSnapshot),
    [currentSnapshot],
  );
  const selectedPaymentMethodKey =
    paymentOptions.find((option) => option.methodKey === formState.paymentMethod)
      ?.methodKey ??
    paymentOptions[0]?.methodKey ??
    formState.paymentMethod;
  const selectedPaymentOption = useMemo(
    () =>
      paymentOptions.find(
        (option) => option.methodKey === selectedPaymentMethodKey,
      ) ?? paymentOptions[0],
    [paymentOptions, selectedPaymentMethodKey],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const syncViewport = () => setIsCompactMobile(mediaQuery.matches);

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    if (isDateNavigating) {
      return;
    }

    let isCancelled = false;
    let isRefreshing = false;

    const refreshAvailability = async () => {
      if (isRefreshing || document.visibilityState === "hidden") {
        return;
      }

      isRefreshing = true;

      try {
        const response = await fetch(
          `/api/venue-snapshot?date=${encodeURIComponent(
            currentSnapshot.selectedDate,
          )}`,
          { cache: "no-store" },
        );
        const nextSnapshot = (await response.json()) as VenueSnapshot;

        if (isCancelled || !response.ok || !nextSnapshot?.selectedDate) {
          return;
        }

        setCurrentSnapshot(nextSnapshot);
        setBookings(filterLiveBookingSlots(nextSnapshot.bookings));
      } catch {
        // Keep the currently visible schedule when a silent refresh fails.
      } finally {
        isRefreshing = false;
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshAvailability();
      }
    };

    void refreshAvailability();
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const interval = window.setInterval(refreshAvailability, 30_000);

    return () => {
      isCancelled = true;
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.clearInterval(interval);
    };
  }, [currentSnapshot.selectedDate, isDateNavigating]);

  useEffect(() => {
    if (!isPaymentMethodSwitching) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsPaymentMethodSwitching(false);
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [isPaymentMethodSwitching]);

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

      const profileDetails = await fetchSignedInProfileDetails(
        supabase,
        session.user.id,
      );
      if (!isMounted) {
        return;
      }

      const resolvedReservationName =
        profileDetails.reservationName || displayName || "";
      const resolvedContactNumber =
        profileDetails.contactNumber || contactNumber;

      setAuthState({
        id: session.user.id,
        email: session.user.email,
        accessToken: session.access_token,
        displayName: resolvedReservationName || displayName,
        contactNumber: resolvedContactNumber,
      });
      setAuthMode("login");
      setAuthStatusMessage("Your BookTheCourt account is connected.");

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
    const shouldRestoreAfterLogin = params.get("resumeReservation") === "1";
    const saved = readReservationResumeState();

    if (!saved) {
      if (shouldRestoreAfterLogin) {
        clearResumeReservationQueryParam();
      }
      return;
    }

    const hasActiveSavedHold =
      saved.holdExpiresAt &&
      new Date(saved.holdExpiresAt).getTime() > Date.now() &&
      Array.isArray(saved.activeHoldIds) &&
      saved.activeHoldIds.length > 0;

    if (!shouldRestoreAfterLogin && !hasActiveSavedHold) {
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
            { cache: "no-store" },
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
          setBookings(filterLiveBookingSlots(nextSnapshot.bookings));
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

    const isRestoringActiveHold = Boolean(
      pendingResumeState.holdExpiresAt &&
        new Date(pendingResumeState.holdExpiresAt).getTime() > Date.now() &&
        pendingResumeState.activeHoldIds?.length,
    );
    const filteredSlots = filterRestorableSlots(
      pendingResumeState.selectedSlots,
      scheduleRows,
      { allowHeldSlots: isRestoringActiveHold },
    );

    if (filteredSlots.length === 0) {
      clearReservationResumeState();
      clearResumeReservationQueryParam();
      pendingResumeStateRef.current = null;
      setSelectedSlots([]);
      setHoldExpiresAt(null);
      setActiveHoldIds([]);
      setPaymentProofFile(null);
      setIsUploadDragging(false);
      setModalStep("details");
      setIsPaymentModalOpen(false);
      setStatusMessage(
        isRestoringActiveHold
          ? "Your previous checkout is already complete or no longer active. The schedule has been refreshed."
          : "Your saved reservation is no longer available. Please choose a new schedule.",
      );
      return;
    }

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
    setHoldExpiresAt(pendingResumeState.holdExpiresAt ?? null);
    setActiveHoldIds(pendingResumeState.activeHoldIds ?? []);
    setIsPaymentModalOpen(
      filteredSlots.length > 0 &&
        (pendingResumeState.isPaymentModalOpen ?? true),
    );
    setModalStep(pendingResumeState.modalStep ?? "details");
    setStatusMessage(
      isRestoringActiveHold &&
        filteredSlots.length === pendingResumeState.selectedSlots.length &&
        filteredSlots.length > 0
        ? "Your payment session was restored after refresh."
        : filteredSlots.length > 0
          ? isRestoringActiveHold
            ? "Your session was restored, but some held slots could not be matched."
            : "Your reservation details were restored after login."
          : "We restored your details, but the selected slots could not be matched to the current schedule.",
    );

    pendingResumeStateRef.current = null;
    if (
      !pendingResumeState.holdExpiresAt ||
      new Date(pendingResumeState.holdExpiresAt).getTime() <= Date.now()
    ) {
      clearReservationResumeState();
    }
    clearResumeReservationQueryParam();
  }, [authState, currentSnapshot.selectedDate, isDateNavigating, scheduleRows]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!hasActiveHold || activeHoldIds.length === 0 || selectedSlots.length === 0) {
      return;
    }

    saveReservationResumeState({
      selectedDate: currentSnapshot.selectedDate,
      selectedSlots,
      formState,
      holdExpiresAt,
      activeHoldIds,
      modalStep,
      isPaymentModalOpen,
    });
  }, [
    activeHoldIds,
    currentSnapshot.selectedDate,
    formState,
    hasActiveHold,
    holdExpiresAt,
    isPaymentModalOpen,
    modalStep,
    selectedSlots,
  ]);

  useEffect(() => {
    if (!isPaymentModalOpen && !bookingConfirmation) {
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
  }, [bookingConfirmation, isPaymentModalOpen]);

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
        { cache: "no-store" },
      );
      const nextSnapshot = (await response.json()) as VenueSnapshot;

      if (!response.ok || !nextSnapshot?.selectedDate) {
        setStatusMessage("We could not load that day's schedule yet.");
        return;
      }

      setCurrentSnapshot(nextSnapshot);
      setBookings(filterLiveBookingSlots(nextSnapshot.bookings));
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
    clearReservationResumeState();
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
    if (
      skipExpiredHoldReleaseRef.current ||
      hasActiveHold ||
      activeHoldIds.length === 0
    ) {
      return;
    }

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
        clearReservationResumeState();
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

  useEffect(() => {
    if (activeHoldIds.length === 0) {
      skipExpiredHoldReleaseRef.current = false;
    }
  }, [activeHoldIds]);

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

  function updatePaymentMethod(methodKey: string) {
    if (methodKey === formState.paymentMethod) {
      return;
    }

    setIsPaymentMethodSwitching(true);
    updateField("paymentMethod", methodKey);
  }

  async function continueToPaymentStep() {
    setStatusMessage("");

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

    let restorableSelection = selectedSlots;

    try {
      const response = await fetch(
        `/api/venue-snapshot?date=${encodeURIComponent(
          currentSnapshot.selectedDate,
        )}`,
        { cache: "no-store" },
      );
      const latestSnapshot = (await response.json()) as VenueSnapshot;

      if (!response.ok || !latestSnapshot?.selectedDate) {
        setStatusMessage("We could not refresh the latest availability yet.");
        return;
      }

      restorableSelection = filterRestorableSlots(
        selectedSlots,
        latestSnapshot.availabilityRows,
      );

      setCurrentSnapshot(latestSnapshot);
      setBookings(filterLiveBookingSlots(latestSnapshot.bookings));

      if (restorableSelection.length !== selectedSlots.length) {
        setSelectedSlots(restorableSelection);
        setStatusMessage(
          restorableSelection.length > 0
            ? "Some selected slots were no longer available, so we refreshed your selection."
            : "Those selected slots are no longer available. Please choose another slot.",
        );
      }
    } catch {
      setStatusMessage("We could not refresh the latest availability yet.");
      return;
    }

    if (restorableSelection.length === 0) {
      return;
    }

    const latestGroupedBlocks = groupSelectedSlots(restorableSelection);

    setIsHoldPending(true);

    try {
      const response = await fetch("/api/booking-holds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playDate: currentSnapshot.selectedDate,
          reservationName: formState.reservationName,
          authAccessToken: authState?.accessToken ?? "",
          selectedBlocks: latestGroupedBlocks.map((block) => ({
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
        payload.set("paymentMethod", selectedPaymentMethodKey);
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
          receiptId?: string;
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

        const nextFormState = authState
          ? {
              ...initialFormState,
              reservationName: authState.displayName || "",
              contactEmail: authState.email || "",
              contactNumber: authState.contactNumber || "",
            }
          : initialFormState;

        skipExpiredHoldReleaseRef.current = true;
        clearReservationResumeState();
        pendingResumeStateRef.current = null;
        clearResumeReservationQueryParam();
        setBookingConfirmation({
          receiptId: result.receiptId ?? "BTC-PENDING",
          reservationName: formState.reservationName,
          selectedDate: currentSnapshot.selectedDate,
          blocks: groupedBlocks.map((block) => ({
            courtId: block.courtId,
            courtName: block.courtName,
            startTime: block.startTime,
            endTime: block.endTime,
            subtotalPhp: block.subtotalPhp,
          })),
          totalPhp: subtotal,
        });
        setStatusMessage(result.message ?? "Booking request saved.");
        setSelectedSlots([]);
        setFormState(nextFormState);
        setActiveHoldIds([]);
        setHoldExpiresAt(null);
        setPaymentProofFile(null);
        setIsUploadDragging(false);
        setIsPaymentModalOpen(false);
        setModalStep("details");
      } catch {
        setStatusMessage("Network error. Please try again.");
      }
    });
  }

  async function handleDownloadBookingConfirmation() {
    if (!bookingConfirmation || isConfirmationDownloading) {
      return;
    }

    setIsConfirmationDownloading(true);
    setConfirmationDownloadError("");

    try {
      const blob = await createBookingReceiptImage({
        confirmation: bookingConfirmation,
        venueName: currentSnapshot.venue.name,
        venueLocation: currentSnapshot.venue.address,
        logoSrc: "/brand/court-logo.png",
      });
      downloadReceiptBlob(blob, `${bookingConfirmation.receiptId}.png`);
    } catch {
      setConfirmationDownloadError(
        "We could not create the image. Please try downloading it again.",
      );
    } finally {
      setIsConfirmationDownloading(false);
    }
  }

  async function handleSaveReceiptToPhotos() {
    if (!bookingConfirmation || isConfirmationDownloading) {
      return;
    }

    setIsConfirmationDownloading(true);
    setConfirmationDownloadError("");

    try {
      const blob = await createBookingReceiptImage({
        confirmation: bookingConfirmation,
        venueName: currentSnapshot.venue.name,
        venueLocation: currentSnapshot.venue.address,
        logoSrc: "/brand/court-logo.png",
      });
      const filename = `${bookingConfirmation.receiptId}.png`;
      const file = new File([blob], filename, { type: "image/png" });

      if (
        typeof navigator.share === "function" &&
        (!navigator.canShare || navigator.canShare({ files: [file] }))
      ) {
        try {
          await navigator.share({
            title: `Reservation receipt ${bookingConfirmation.receiptId}`,
            text: `Reservation receipt ${bookingConfirmation.receiptId}`,
            files: [file],
          });
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
        }
      }

      downloadReceiptBlob(blob, filename);
    } catch {
      setConfirmationDownloadError(
        "We could not prepare the receipt image. Please try again.",
      );
    } finally {
      setIsConfirmationDownloading(false);
    }
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
        <div className="h-fit w-full min-w-0 max-w-full overflow-hidden rounded-none bg-(--color-surface-elevated) sm:rounded-[1.35rem] sm:border sm:border-(--color-border-soft)">
          <div className="border-b border-(--color-border-muted) px-4 py-5 sm:px-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-text-soft)">
                    Availability
                  </p>
                  <h3 className="mt-1 text-[1.6rem] font-semibold leading-none tracking-[-0.045em] text-(--color-text-primary) sm:text-[1.85rem]">
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
            <div>
              <p className="text-sm font-medium text-[color:var(--color-text-secondary)]">
                Tap an available slot to start booking.
              </p>
              <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">
                Bright cells are open. Muted cells are held, pending, booked, or
                outside operating hours.
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
          <div className="fixed inset-0 z-[1500] flex items-center justify-center overscroll-contain bg-[rgba(var(--color-overlay-rgb),0.58)] p-2 backdrop-blur-md sm:p-5">
            <div className="flex max-h-[95dvh] w-full max-w-[1180px] flex-col overflow-hidden overscroll-contain rounded-[1.6rem] border border-(--color-border-card) bg-(--color-surface) shadow-[0_36px_140px_rgba(var(--color-shadow-rgb),0.28)] sm:rounded-[2rem]">
              <div className="theme-gradient-surface sticky top-0 z-20 flex items-start justify-between border-b border-(--color-border-panel) px-5 py-5 sm:px-8 sm:py-7">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-(--color-brand)">
                    Secure checkout
                  </p>
                  <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-(--color-text-primary) sm:text-[1.7rem]">
                    {getModalTitle(modalStep)}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-(--color-text-muted) sm:text-[0.95rem]">
                    {getModalDescription(modalStep)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close booking modal"
                  onClick={closePaymentModal}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-(--color-border-panel) bg-[rgba(var(--color-surface-rgb),0.82)] text-lg leading-none text-(--color-text-muted) shadow-[0_8px_24px_rgba(var(--color-shadow-rgb),0.06)] transition hover:border-(--color-brand) hover:text-(--color-brand)"
                >
                  ×
                </button>
              </div>

              <form
                ref={paymentModalScrollRef}
                className="min-h-0 flex-1 overflow-y-auto"
                onSubmit={submitBookings}
              >
                <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_360px]">
                <div className="border-b border-(--color-border-panel) px-5 py-5 md:border-b-0 md:border-r md:px-8 md:py-7">
                  <div className="space-y-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="grid min-w-0 flex-1 grid-cols-2 gap-1 rounded-[1rem] border border-(--color-border-panel) bg-(--color-surface-soft) p-1">
                        <div
                          className={`min-w-0 rounded-[0.75rem] px-3 py-3 transition sm:px-4 ${
                            modalStep === "details"
                              ? "bg-(--color-brand-strong) text-white shadow-[0_10px_26px_rgba(var(--color-shadow-brand-rgb),0.18)]"
                              : "text-(--color-text-soft)"
                          }`}
                        >
                          <p className="text-[9px] font-bold uppercase tracking-[0.18em] opacity-60">
                            Step 01
                          </p>
                          <p
                            className="mt-1 text-xs font-semibold tracking-[-0.02em] sm:text-sm"
                          >
                            Reservation details
                          </p>
                        </div>
                        <div
                          className={`min-w-0 rounded-[0.75rem] px-3 py-3 transition sm:px-4 ${
                            modalStep === "payment"
                              ? "bg-(--color-brand-strong) text-white shadow-[0_10px_26px_rgba(var(--color-shadow-brand-rgb),0.18)]"
                              : "text-(--color-text-soft)"
                          }`}
                        >
                          <p className="text-[9px] font-bold uppercase tracking-[0.18em] opacity-60">
                            Step 02
                          </p>
                          <p
                            className="mt-1 text-xs font-semibold tracking-[-0.02em] sm:text-sm"
                          >
                            Payment proof
                          </p>
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
                        <section className="rounded-[1.4rem] border border-[color:var(--color-border-panel)] bg-[color:var(--color-surface-soft)] p-4 sm:p-5">
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
                        <div className="grid gap-5">
                          <div className="grid gap-2 text-sm font-medium text-[color:var(--color-text-secondary)]">
                            <p>Payment method</p>
                            <div className="flex flex-wrap gap-2">
                              {paymentOptions.map((option) => {
                                const isSelected =
                                  option.methodKey ===
                                  selectedPaymentOption?.methodKey;

                                return (
                                  <button
                                    key={option.methodKey}
                                    type="button"
                                    onClick={() =>
                                      updatePaymentMethod(option.methodKey)
                                    }
                                    aria-pressed={isSelected}
                                    className={`inline-flex min-h-11 items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition ${
                                      isSelected
                                        ? "border-[color:var(--color-action-primary)] bg-[color:var(--color-action-primary)] text-white shadow-[0_10px_26px_rgba(var(--color-shadow-brand-rgb),0.18)]"
                                        : "border-[color:var(--color-border-panel)] bg-[rgba(var(--color-surface-rgb),0.82)] text-[color:var(--color-text-secondary)] hover:border-[color:var(--color-action-primary)] hover:text-[color:var(--color-text-primary)]"
                                    }`}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="grid gap-4 rounded-[1.4rem] border border-[color:var(--color-border-panel)] bg-[color:var(--color-surface-soft)] p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-[color:var(--color-text-primary)]">
                                  Scan to pay with{" "}
                                  {selectedPaymentOption?.label ??
                                    "your selected method"}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-[color:var(--color-text-muted)]">
                                  The QR updates when you choose a different
                                  payment pill.
                                </p>
                              </div>
                              {isPaymentMethodSwitching ? (
                                <span className="inline-flex items-center rounded-full bg-[color:var(--color-surface-info)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-action-primary)]">
                                  Loading...
                                </span>
                              ) : null}
                            </div>

                            <div className="relative mx-auto w-full max-w-[360px] overflow-hidden rounded-[1.25rem] border border-[color:var(--color-border-panel-soft)] bg-white p-2 shadow-[0_18px_50px_rgba(var(--color-shadow-rgb),0.1)]">
                              <div
                                className={`absolute inset-0 z-10 flex items-center justify-center bg-[rgba(var(--color-surface-rgb),0.72)] backdrop-blur-[2px] transition ${
                                  isPaymentMethodSwitching
                                    ? "pointer-events-auto opacity-100"
                                    : "pointer-events-none opacity-0"
                                }`}
                              >
                                <div className="flex items-center gap-3 rounded-full border border-[color:var(--color-border-panel)] bg-[rgba(var(--color-surface-rgb),0.92)] px-4 py-2 text-sm font-semibold text-[color:var(--color-text-primary)] shadow-[0_10px_24px_rgba(var(--color-shadow-rgb),0.08)]">
                                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[color:var(--color-action-primary)]" />
                                  Switching payment method
                                </div>
                              </div>

                              {selectedPaymentOption?.qrUrl ? (
                                <LoadingImage
                                  src={selectedPaymentOption.qrUrl}
                                  alt={`${selectedPaymentOption.label} QR code`}
                                  width={720}
                                  height={720}
                                  unoptimized
                                  wrapperClassName="aspect-square w-full overflow-hidden rounded-[0.9rem] bg-white"
                                  className="h-full w-full object-contain"
                                  skeletonClassName="bg-[image:var(--gradient-loading-neutral)]"
                                  onLoad={() =>
                                    setIsPaymentMethodSwitching(false)
                                  }
                                  onError={() =>
                                    setIsPaymentMethodSwitching(false)
                                  }
                                />
                              ) : (
                                <div className="flex aspect-square w-full flex-col items-center justify-center px-6 py-8 text-center">
                                  <div className="rounded-full bg-[color:var(--color-surface-info)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-action-primary)]">
                                    QR unavailable
                                  </div>
                                  <p className="mt-4 text-sm font-semibold text-[color:var(--color-text-primary)]">
                                    No QR image has been uploaded for{" "}
                                    {selectedPaymentOption?.label ??
                                      "this payment method"}
                                    .
                                  </p>
                                  <p className="mt-2 max-w-xs text-xs leading-5 text-[color:var(--color-text-muted)]">
                                    The user can still upload proof after paying
                                    manually, but adding the QR in BookTheCourt
                                    owner settings will make checkout smoother.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

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
                            What happens next
                          </p>
                          <p className="mt-2 leading-6">
                            After sending payment through{" "}
                            {selectedPaymentOption?.label ?? "your selected method"}
                            , upload your screenshot here. Your reservation will
                            stay marked as pending until the venue reviews and
                            verifies it.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="theme-gradient-surface px-5 py-5 md:px-6 md:py-7">
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

                    <div className="mt-8 border-t border-[color:var(--color-border-panel)] pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-5">
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
                        className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-[0.9rem] bg-[color:var(--color-action-primary)] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(var(--color-shadow-brand-rgb),0.24)] transition hover:-translate-y-0.5 hover:bg-[color:var(--color-action-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
                      >
                        {isPending || isHoldPending
                          ? "Saving..."
                          : modalStep === "details"
                            ? "Continue to Payment"
                            : "Send Payment Proof"}
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

      {bookingConfirmation ? (
        <BodyPortal>
          <div className="fixed inset-0 z-[1600] flex items-center justify-center bg-[rgba(var(--color-overlay-rgb),0.62)] p-3 backdrop-blur-md sm:p-5">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="booking-confirmation-title"
              className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-(--color-border-card) bg-(--color-surface) shadow-[0_36px_140px_rgba(var(--color-shadow-rgb),0.3)]"
            >
              <div className="theme-gradient-panel relative overflow-hidden px-6 py-7 text-white sm:px-8 sm:py-9">
                <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full border border-white/12" />
                <div className="relative flex items-start justify-between gap-5">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/14 text-(--color-brand-accent) ring-1 ring-white/18">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-6 w-6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="m5 12 4 4L19 6" />
                        </svg>
                      </span>
                      <div className="flex h-12 items-center rounded-xl border border-white/16 bg-white/92 px-3 shadow-sm">
                        <LoadingImage
                          src="/brand/court-logo.png"
                          alt={`${currentSnapshot.venue.name} logo`}
                          width={112}
                          height={42}
                          className="h-9 w-auto object-contain"
                          wrapperClassName="h-9 w-28"
                          skeletonClassName="bg-white"
                        />
                      </div>
                    </div>
                    <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/58">
                      Request received
                    </p>
                    <h3
                      id="booking-confirmation-title"
                      className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
                    >
                      Your booking is pending verification
                    </h3>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-white/72">
                      Your payment proof was sent successfully. The venue will
                      review it before confirming your reservation.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBookingConfirmation(null)}
                    aria-label="Close booking confirmation"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/14 bg-white/8 text-lg text-white/72 transition hover:bg-white/14 hover:text-white"
                  >
                    ×
                  </button>
                </div>

                <div className="relative mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setIsReceiptPreviewOpen(true)}
                    className="inline-flex min-h-12 items-center justify-center rounded-[0.9rem] border border-white/18 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/16"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="mr-2 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                      <path d="m7 15 3-3 2 2 3-4 2 3" />
                    </svg>
                    Preview receipt
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        authState
                          ? "/my-bookings"
                          : "/login?returnTo=%2Fmy-bookings",
                      )
                    }
                    className="inline-flex min-h-12 items-center justify-center rounded-[0.9rem] bg-(--color-brand-accent) px-5 py-3 text-sm font-semibold text-(--color-brand-strong) transition hover:bg-(--color-brand-accent-hover)"
                  >
                    {authState ? "Check My Bookings" : "Sign in to check booking"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingConfirmation(null)}
                    className="inline-flex min-h-11 items-center justify-center rounded-[0.9rem] border border-white/14 bg-transparent px-5 py-2.5 text-sm font-semibold text-white/78 transition hover:bg-white/10 hover:text-white sm:col-span-2"
                  >
                    Back to schedule
                  </button>
                </div>
                {confirmationDownloadError ? (
                  <p className="relative mt-3 rounded-xl border border-white/16 bg-black/20 px-4 py-3 text-sm font-medium text-white/86">
                    {confirmationDownloadError}
                  </p>
                ) : null}
              </div>

              <div className="px-6 py-6 sm:px-8 sm:py-7">
                <div className="flex flex-col gap-4 border-b border-(--color-border-soft) pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-(--color-text-soft)">
                      Reservation date
                    </p>
                    <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-(--color-text-primary)">
                      {formatDisplayDate(bookingConfirmation.selectedDate)}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-(--color-text-soft)">
                      Receipt ID
                    </p>
                    <p className="mt-2 font-mono text-sm font-semibold text-(--color-brand)">
                      {bookingConfirmation.receiptId}
                    </p>
                  </div>
                </div>

                <div className="mt-2 divide-y divide-(--color-border-soft)">
                  {bookingConfirmation.blocks.map((block) => (
                    <div
                      key={`${block.courtId}-${block.startTime}`}
                      className="flex items-start justify-between gap-4 py-4"
                    >
                      <div>
                        <p className="font-semibold text-(--color-text-primary)">
                          {block.courtName}
                        </p>
                        <p className="mt-1 text-sm text-(--color-text-muted)">
                          {formatTimeLabel(block.startTime)} -{" "}
                          {formatTimeLabel(block.endTime)}
                        </p>
                      </div>
                      <p className="font-semibold text-(--color-text-primary)">
                        {formatCurrency(block.subtotalPhp)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-(--color-border-soft) pt-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-(--color-text-soft)">
                    Total submitted
                  </p>
                  <p className="text-2xl font-semibold tracking-[-0.04em] text-(--color-action-primary)">
                    {formatCurrency(bookingConfirmation.totalPhp)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </BodyPortal>
      ) : null}

      {bookingConfirmation && isReceiptPreviewOpen ? (
        <BodyPortal>
          <div className="fixed inset-0 z-[1700] flex items-center justify-center bg-[rgba(var(--color-overlay-rgb),0.72)] p-3 backdrop-blur-lg sm:p-5">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="booking-receipt-preview-title"
              className="max-h-[96dvh] w-full max-w-5xl overflow-y-auto rounded-[1.75rem] border border-(--color-border-card) bg-(--color-surface) shadow-[0_40px_160px_rgba(var(--color-shadow-rgb),0.4)]"
            >
              <div className="flex items-start justify-between gap-5 px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
                <div>
                  <h3
                    id="booking-receipt-preview-title"
                    className="text-xl font-semibold tracking-[-0.03em] text-(--color-text-primary) sm:text-2xl"
                  >
                    Reservation receipt preview
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-(--color-text-muted)">
                    Review the generated booking receipt, then save or download
                    the image when you are ready.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReceiptPreviewOpen(false)}
                  aria-label="Close receipt preview"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-(--color-border-soft) bg-(--color-surface) text-lg text-(--color-text-muted) transition hover:border-(--color-brand) hover:text-(--color-brand)"
                >
                  ×
                </button>
              </div>

              <div className="flex flex-col gap-3 border-b border-(--color-border-soft) px-5 pb-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-7">
                <p className="font-mono text-xs font-semibold text-(--color-text-soft)">
                  {bookingConfirmation.receiptId}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                  <button
                    type="button"
                    onClick={() => void handleSaveReceiptToPhotos()}
                    disabled={isConfirmationDownloading}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-(--color-border-soft) bg-(--color-surface) px-5 py-2.5 text-sm font-semibold text-(--color-text-secondary) transition hover:border-(--color-brand) hover:text-(--color-brand) disabled:cursor-wait disabled:opacity-60"
                  >
                    Save to Photos
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDownloadBookingConfirmation()}
                    disabled={isConfirmationDownloading}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#087f83] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(8,127,131,0.22)] transition hover:bg-[#076d71] disabled:cursor-wait disabled:opacity-60"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="mr-2 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 3v12" />
                      <path d="m7 10 5 5 5-5" />
                      <path d="M5 21h14" />
                    </svg>
                    {isConfirmationDownloading
                      ? "Preparing image..."
                      : "Download image"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsReceiptPreviewOpen(false)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-(--color-border-soft) bg-(--color-surface) px-5 py-2.5 text-sm font-semibold text-(--color-text-secondary) transition hover:border-(--color-brand) hover:text-(--color-brand)"
                  >
                    Close
                  </button>
                </div>
              </div>
              {confirmationDownloadError ? (
                <p className="mx-5 mt-4 rounded-xl border border-(--color-border-danger) bg-(--color-surface-danger-soft) px-4 py-3 text-sm font-medium text-(--color-danger-strong) sm:mx-7">
                  {confirmationDownloadError}
                </p>
              ) : null}

              <div className="bg-(--color-surface-soft) p-3 sm:p-5">
                <BookingReceiptPreviewCard
                  confirmation={bookingConfirmation}
                  venueName={currentSnapshot.venue.name}
                  venueLocation={currentSnapshot.venue.address}
                />
              </div>
            </div>
          </div>
        </BodyPortal>
      ) : null}
    </div>
  );
}

function BookingReceiptPreviewCard({
  confirmation,
  venueName,
  venueLocation,
}: {
  confirmation: BookingConfirmationState;
  venueName: string;
  venueLocation: string;
}) {
  return (
    <div className="mx-auto aspect-[16/9] min-h-[31rem] w-full overflow-hidden rounded-xl bg-[#0c5059] p-[3%] text-white shadow-[0_24px_70px_rgba(8,63,70,0.24)] sm:min-h-0">
      <div className="relative flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-white/8 bg-[linear-gradient(135deg,#2b6469_0%,#2e6872_52%,#347d7d_100%)] p-5 sm:p-7 lg:p-9">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#8dd9d3] sm:text-xs">
              BookTheCourt receipt
            </p>
            <p className="mt-1 font-mono text-xl tracking-[-0.03em] sm:text-3xl">
              {confirmation.receiptId}
            </p>
            <p className="mt-1 text-[10px] text-white/66 sm:text-sm">
              {confirmation.reservationName} · {venueName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden rounded-xl bg-white/92 px-2 py-1.5 sm:block">
              <LoadingImage
                src="/brand/court-logo.png"
                alt={`${venueName} logo`}
                width={96}
                height={36}
                className="h-7 w-auto object-contain"
                wrapperClassName="h-7 w-24"
                skeletonClassName="bg-white"
              />
            </div>
            <span className="rounded-full bg-[#fff2cf] px-3 py-1.5 text-[10px] font-semibold text-[#9a6615] sm:px-4 sm:text-xs">
              Pending
            </span>
          </div>
        </div>

        <div className="relative mt-5 grid gap-2 sm:grid-cols-4 sm:gap-3">
          <ReceiptPreviewField
            label="Reserved by"
            value={confirmation.reservationName}
          />
          <ReceiptPreviewField label="Facility" value={venueName} />
          <ReceiptPreviewField label="Location" value={venueLocation} />
          <ReceiptPreviewField
            label="Date"
            value={formatReceiptDateLabel(confirmation.selectedDate)}
          />
        </div>

        <div className="relative mt-2 grid flex-1 gap-2 sm:grid-cols-[0.95fr_1.05fr] sm:gap-3">
          <ReceiptPreviewField
            label="Paid amount"
            value={formatReceiptAmount(confirmation.totalPhp)}
            large
          />
          <div className="rounded-xl bg-white/10 px-4 py-3 sm:px-5 sm:py-4">
            <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/48 sm:text-[10px]">
              Courts
            </p>
            <div className="mt-2 space-y-0.5 text-[10px] leading-4 text-white/92 sm:text-sm sm:leading-5">
              {confirmation.blocks.map((block) => (
                <p key={`${block.courtId}-${block.startTime}`}>
                  {block.courtName} - {formatTimeLabel(block.startTime)} -{" "}
                  {formatTimeLabel(block.endTime)}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="relative mt-4 flex items-end justify-between gap-4 text-[8px] leading-3.5 text-white/65 sm:text-[10px] sm:leading-4">
          <div>
            <p>Match this receipt ID with your booking reference when needed.</p>
            <p>Once the reservation is approved you will receive an email.</p>
            <p>Generated directly by BookTheCourt.</p>
          </div>
          <span className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-white/60">
            {confirmation.blocks.length} slot
            {confirmation.blocks.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </div>
  );
}

function ReceiptPreviewField({
  label,
  value,
  large = false,
}: {
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/10 px-4 py-3 sm:px-5 sm:py-4">
      <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/48 sm:text-[10px]">
        {label}
      </p>
      <p
        className={`mt-1.5 font-medium text-white/94 ${
          large ? "text-sm sm:text-lg" : "text-[10px] sm:text-sm"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

async function createBookingReceiptImage({
  confirmation,
  venueName,
  venueLocation,
  logoSrc,
}: {
  confirmation: BookingConfirmationState;
  venueName: string;
  venueLocation: string;
  logoSrc: string;
}) {
  await document.fonts?.ready;

  const width = 1600;
  const height = 900;
  const scale = 1.5;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to create the confirmation image.");
  }

  context.scale(scale, scale);
  context.textBaseline = "alphabetic";

  context.fillStyle = "#0c5059";
  context.fillRect(0, 0, width, height);

  const receiptGradient = context.createLinearGradient(80, 80, 1520, 820);
  receiptGradient.addColorStop(0, "#2a6268");
  receiptGradient.addColorStop(0.52, "#2d6972");
  receiptGradient.addColorStop(1, "#347d7d");
  drawRoundedRect(context, 80, 68, 1440, 764, 32);
  context.fillStyle = receiptGradient;
  context.fill();
  context.strokeStyle = "rgba(255,255,255,0.08)";
  context.lineWidth = 2;
  context.stroke();

  const logo = await loadCanvasImage(logoSrc).catch(() => null);
  if (logo) {
    drawRoundedRect(context, 1250, 105, 180, 74, 16);
    context.fillStyle = "rgba(255,255,255,0.94)";
    context.fill();
    drawContainedImage(context, logo, 1268, 115, 144, 54);
  }

  context.fillStyle = "#8dd9d3";
  context.font = "700 16px Avenir Next, Segoe UI, sans-serif";
  context.fillText("BOOKTHECOURT RECEIPT", 125, 126);

  context.fillStyle = "#ffffff";
  context.font = "500 36px IBM Plex Mono, monospace";
  context.fillText(confirmation.receiptId, 125, 174);
  context.fillStyle = "rgba(255,255,255,0.68)";
  context.font = "500 18px Avenir Next, Segoe UI, sans-serif";
  context.fillText(
    `${confirmation.reservationName} · ${venueName}`,
    125,
    208,
  );

  drawCanvasPill(context, 1318, 194, 112, 42, "Pending");

  const topFields = [
    { label: "RESERVED BY", value: confirmation.reservationName },
    { label: "FACILITY", value: venueName },
    { label: "LOCATION", value: venueLocation },
    { label: "DATE", value: formatReceiptDateLabel(confirmation.selectedDate) },
  ];
  const fieldWidth = 324;
  topFields.forEach((field, index) => {
    drawReceiptCanvasField(context, {
      x: 125 + index * 340,
      y: 250,
      width: fieldWidth,
      height: 100,
      label: field.label,
      value: field.value,
    });
  });

  drawReceiptCanvasField(context, {
    x: 125,
    y: 370,
    width: 664,
    height: 196,
    label: "PAID AMOUNT",
    value: formatReceiptAmount(confirmation.totalPhp),
    valueSize: 28,
  });

  drawRoundedRect(context, 809, 370, 621, 196, 20);
  context.fillStyle = "rgba(255,255,255,0.10)";
  context.fill();
  drawReceiptCanvasLabel(context, "COURTS", 833, 405);
  context.fillStyle = "rgba(255,255,255,0.94)";
  context.font = "500 20px Avenir Next, Segoe UI, sans-serif";
  confirmation.blocks.slice(0, 6).forEach((block, index) => {
    context.fillText(
      fitCanvasText(
        context,
        `${block.courtName} - ${formatTimeLabel(block.startTime)} - ${formatTimeLabel(block.endTime)}`,
        565,
      ),
      833,
      440 + index * 27,
    );
  });

  context.fillStyle = "rgba(255,255,255,0.64)";
  context.font = "500 15px Avenir Next, Segoe UI, sans-serif";
  context.fillText(
    "Match this receipt ID with your booking reference when needed.",
    125,
    712,
  );
  context.fillText(
    "Once the reservation is approved you will receive an email.",
    125,
    738,
  );
  context.fillText("Generated directly by BookTheCourt.", 125, 764);

  const slotLabel = `${confirmation.blocks.length} slot${confirmation.blocks.length === 1 ? "" : "s"}`;
  context.font = "600 15px Avenir Next, Segoe UI, sans-serif";
  const slotPillWidth = Math.max(82, context.measureText(slotLabel).width + 36);
  drawRoundedRect(context, 1430 - slotPillWidth, 726, slotPillWidth, 42, 21);
  context.fillStyle = "rgba(255,255,255,0.10)";
  context.fill();
  context.fillStyle = "rgba(255,255,255,0.62)";
  context.textAlign = "center";
  context.fillText(slotLabel, 1430 - slotPillWidth / 2, 753);
  context.textAlign = "left";

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) {
        resolve(result);
      } else {
        reject(new Error("Unable to export the confirmation image."));
      }
    }, "image/png");
  });
}

function drawReceiptCanvasField(
  context: CanvasRenderingContext2D,
  input: {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    value: string;
    valueSize?: number;
  },
) {
  drawRoundedRect(context, input.x, input.y, input.width, input.height, 20);
  context.fillStyle = "rgba(255,255,255,0.10)";
  context.fill();
  drawReceiptCanvasLabel(context, input.label, input.x + 24, input.y + 34);
  context.fillStyle = "rgba(255,255,255,0.94)";
  context.font = `500 ${input.valueSize ?? 23}px Avenir Next, Segoe UI, sans-serif`;
  context.fillText(
    fitCanvasText(context, input.value, input.width - 48),
    input.x + 24,
    input.y + 72,
  );
}

function drawReceiptCanvasLabel(
  context: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
) {
  context.fillStyle = "rgba(255,255,255,0.48)";
  context.font = "700 12px Avenir Next, Segoe UI, sans-serif";
  context.fillText(label, x, y);
}

function drawCanvasPill(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
) {
  drawRoundedRect(context, x, y, width, height, height / 2);
  context.fillStyle = "#fff2cf";
  context.fill();
  context.fillStyle = "#9a6615";
  context.font = "600 16px Avenir Next, Segoe UI, sans-serif";
  context.textAlign = "center";
  context.fillText(label, x + width / 2, y + 27);
  context.textAlign = "left";
}

function downloadReceiptBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = objectUrl;
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load image: ${src}`));
    image.src = src;
  });
}

function drawContainedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const ratio = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * ratio;
  const drawHeight = image.naturalHeight * ratio;
  context.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function fitCanvasText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
) {
  if (context.measureText(value).width <= maxWidth) {
    return value;
  }

  let shortened = value;
  while (
    shortened.length > 1 &&
    context.measureText(`${shortened}…`).width > maxWidth
  ) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened}…`;
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
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();

    if (!data || typeof data !== "object") {
      return { reservationName: "", contactNumber: "" };
    }

    const profile = data as Record<string, unknown>;
    const reservationName = stringOrEmpty(profile.display_name);
    const contactNumber = "";

    return { reservationName, contactNumber };
  } catch {
    return { reservationName: "", contactNumber: "" };
  }
}

function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

function readReservationResumeState(): ReservationResumeState | null {
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
      holdExpiresAt: parsed.holdExpiresAt
        ? String(parsed.holdExpiresAt)
        : null,
      activeHoldIds: Array.isArray(parsed.activeHoldIds)
        ? parsed.activeHoldIds.map((id) => String(id)).filter(Boolean)
        : [],
      modalStep:
        parsed.modalStep === "payment" ? "payment" : "details",
      isPaymentModalOpen:
        typeof parsed.isPaymentModalOpen === "boolean"
          ? parsed.isPaymentModalOpen
          : undefined,
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
  options: { allowHeldSlots?: boolean } = {},
) {
  const restorableKeys = new Set(
    rows.flatMap((row) =>
      row.courts
        .filter(
          (court) =>
            court.status === "available" ||
            (options.allowHeldSlots && court.status === "hold"),
        )
        .map((court) => `${court.courtId}-${row.startTime}`),
    ),
  );

  return slots.filter((slot) =>
    restorableKeys.has(getSelectedSlotKey(slot.courtId, slot.startTime)),
  );
}

function filterLiveBookingSlots(bookings: BookingSlot[]) {
  const now = Date.now();

  return bookings.filter((booking) => {
    if (booking.status !== "hold") {
      return true;
    }

    if (!booking.holdExpiresAt) {
      return false;
    }

    const expiresAt = new Date(booking.holdExpiresAt).getTime();
    return Number.isFinite(expiresAt) && expiresAt > now;
  });
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

function formatReceiptDateLabel(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatReceiptAmount(value: number) {
  return `PHP ${Math.round(value).toLocaleString("en-PH")}`;
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
  return step === "details" ? "Review your reservation" : "Send payment proof";
}

function getModalDescription(step: ModalStep) {
  return step === "details"
    ? "Confirm your details, keep your hold active, and continue to payment when you're ready."
    : "Send your payment screenshot so the venue can verify and finalize your reservation.";
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

function getDisplayPaymentOptions(snapshot: VenueSnapshot): PaymentOption[] {
  if (snapshot.venue.paymentOptions.length > 0) {
    return snapshot.venue.paymentOptions;
  }

  return [
    { methodKey: "gcash", label: "GCash", qrUrl: null },
    { methodKey: "paymaya", label: "PayMaya", qrUrl: null },
    { methodKey: "bank", label: "Bank Transfer", qrUrl: null },
  ];
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
