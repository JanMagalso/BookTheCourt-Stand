"use client";

import AutoScroll from "embla-carousel-auto-scroll";
import useEmblaCarousel from "embla-carousel-react";
import { useEffect, useEffectEvent, useMemo, useState } from "react";

import { LoadingImage } from "@/components/loading-image";

type FacilityPhotoMosaicProps = {
  photos: string[];
  title: string;
};

export function FacilityPhotoMosaic({
  photos,
  title,
}: FacilityPhotoMosaicProps) {
  const cleanPhotos = photos.filter(Boolean);
  const photoCount = cleanPhotos.length;
  const renderedPhotos =
    photoCount > 0 && photoCount <= 4
      ? [...cleanPhotos, ...cleanPhotos]
      : cleanPhotos;
  const autoScrollPlugin = useMemo(
    () =>
      AutoScroll({
        playOnInit: true,
        startDelay: 0,
        speed: 1,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
        stopOnFocusIn: true,
      }),
    [],
  );
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: photoCount > 1,
      align: "center",
      dragFree: false,
    },
    photoCount > 1 ? [autoScrollPlugin] : [],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoScrollPlaying, setIsAutoScrollPlaying] = useState(photoCount > 1);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const isCarouselReady = Boolean(
    emblaApi && photoCount > 1 && emblaApi.slideNodes().length > 0,
  );
  const isLightboxOpen = lightboxIndex !== null;
  const syncSelectedIndex = useEffectEvent(() => {
    const nextIndex = emblaApi?.selectedScrollSnap() ?? 0;
    setActiveIndex(photoCount > 0 ? nextIndex % photoCount : 0);
  });

  const syncAutoScrollState = useEffectEvent(() => {
    if (!emblaApi || photoCount <= 1) {
      setIsAutoScrollPlaying(false);
      return;
    }

    const autoScroll = getAutoScrollPlugin(emblaApi);
    setIsAutoScrollPlaying(autoScroll?.isPlaying() ?? false);
  });

  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    queueMicrotask(syncSelectedIndex);
    emblaApi.on("select", syncSelectedIndex);
    emblaApi.on("reInit", syncSelectedIndex);

    return () => {
      emblaApi.off("select", syncSelectedIndex);
      emblaApi.off("reInit", syncSelectedIndex);
    };
  }, [emblaApi, photoCount]);

  useEffect(() => {
    if (!emblaApi || photoCount <= 1) {
      return;
    }

    queueMicrotask(syncAutoScrollState);

    emblaApi.on("autoScroll:play", syncAutoScrollState);
    emblaApi.on("autoScroll:stop", syncAutoScrollState);
    emblaApi.on("pointerDown", syncAutoScrollState);
    emblaApi.on("settle", syncAutoScrollState);

    return () => {
      emblaApi.off("autoScroll:play", syncAutoScrollState);
      emblaApi.off("autoScroll:stop", syncAutoScrollState);
      emblaApi.off("pointerDown", syncAutoScrollState);
      emblaApi.off("settle", syncAutoScrollState);
    };
  }, [emblaApi, photoCount]);

  useEffect(() => {
    if (!isLightboxOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightboxIndex(null);
        setLightboxZoom(1);
        return;
      }

      if (photoCount <= 1) {
        return;
      }

      if (event.key === "ArrowLeft") {
        setLightboxIndex((current) =>
          current === null ? 0 : (current - 1 + photoCount) % photoCount,
        );
        setLightboxZoom(1);
      }

      if (event.key === "ArrowRight") {
        setLightboxIndex((current) =>
          current === null ? 0 : (current + 1) % photoCount,
        );
        setLightboxZoom(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLightboxOpen, photoCount]);

  if (cleanPhotos.length === 0) {
    return (
      <div className="flex h-[350px] items-center justify-center rounded-3xl bg-[image:var(--gradient-loading-neutral)] text-sm font-semibold text-[color:var(--color-text-soft)]">
        No facility image yet
      </div>
    );
  }

  const safeIndex =
    activeIndex >= 0 && activeIndex < cleanPhotos.length ? activeIndex : 0;

  const scrollTo = (index: number) => {
    if (!isCarouselReady) {
      return;
    }

    emblaApi.scrollTo(index);
  };

  const showPrevious = () => {
    if (!isCarouselReady) {
      return;
    }

    emblaApi.scrollPrev();
  };

  const showNext = () => {
    if (!isCarouselReady) {
      return;
    }

    emblaApi.scrollNext();
  };

  const toggleAutoScroll = () => {
    if (!isCarouselReady) {
      return;
    }

    const autoScroll = getAutoScrollPlugin(emblaApi);

    if (!autoScroll) {
      return;
    }

    if (autoScroll.isPlaying()) {
      autoScroll.stop();
      setIsAutoScrollPlaying(false);
      return;
    }

    autoScroll.play();
    setIsAutoScrollPlaying(true);
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index % photoCount);
    setLightboxZoom(1);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
    setLightboxZoom(1);
  };

  const showLightboxPrevious = () => {
    if (photoCount <= 1) {
      return;
    }

    setLightboxIndex((current) =>
      current === null ? 0 : (current - 1 + photoCount) % photoCount,
    );
    setLightboxZoom(1);
  };

  const showLightboxNext = () => {
    if (photoCount <= 1) {
      return;
    }

    setLightboxIndex((current) =>
      current === null ? 0 : (current + 1) % photoCount,
    );
    setLightboxZoom(1);
  };

  const updateLightboxZoom = (nextZoom: number) => {
    setLightboxZoom(Math.max(1, Math.min(nextZoom, 4)));
  };

  const activeLightboxPhoto =
    lightboxIndex !== null ? cleanPhotos[lightboxIndex] : null;

  return (
    <div className="space-y-5">
      <div className="relative w-full overflow-hidden rounded-[2.2rem] border border-[color:var(--color-border-card)] bg-[color:var(--color-surface-soft)] shadow-[0_24px_80px_rgba(var(--color-shadow-rgb),0.12)]">
        <div className="overflow-hidden px-3 sm:px-4 lg:px-5" ref={emblaRef}>
          <div className="-ml-3 flex touch-pan-y sm:-ml-4 lg:-ml-5">
            {renderedPhotos.map((photo, index) => (
              <div
                key={`${photo}-${index}`}
                className="min-w-0 shrink-0 grow-0 basis-[92%] pl-3 sm:basis-[72%] sm:pl-4 md:basis-1/2 lg:basis-1/4 lg:pl-5"
              >
                <button
                  type="button"
                  onClick={() => openLightbox(index)}
                  className="relative block w-full overflow-hidden rounded-[2rem] text-left transition-transform duration-200 hover:scale-[1.01]"
                  aria-label={`Open ${title} photo ${(index % photoCount) + 1}`}
                >
                  <LoadingImage
                    src={photo}
                    alt={`${title} photo ${(index % photoCount) + 1}`}
                    width={1600}
                    height={1100}
                    className="aspect-[16/10] w-full bg-[color:var(--color-hero-deep)] object-contain md:aspect-[4/3] md:object-cover lg:aspect-[5/4]"
                    skeletonClassName="bg-[image:var(--gradient-loading-slate)]"
                  />
                  <span className="pointer-events-none absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(var(--color-overlay-rgb),0.68)] text-white shadow-[0_10px_24px_rgba(var(--color-shadow-rgb),0.22)]">
                    <span aria-hidden="true" className="text-lg leading-none">
                      ⌕
                    </span>
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {cleanPhotos.length > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border-card)] bg-[color:var(--color-surface)] px-3 py-2 text-[11px] font-semibold tracking-[0.18em] text-[color:var(--color-text-primary)] shadow-[0_8px_24px_rgba(var(--color-shadow-rgb),0.08)]">
            <span>
              {safeIndex + 1} / {cleanPhotos.length}
            </span>
            <div className="flex items-center gap-2">
              {cleanPhotos.map((dotPhoto, dotIndex) => (
                <button
                  key={`${dotPhoto}-dot-${dotIndex}`}
                  type="button"
                  aria-label={`Show photo ${dotIndex + 1}`}
                  onClick={() => scrollTo(dotIndex)}
                  disabled={!isCarouselReady}
                  className={`h-2.5 rounded-full transition-all ${
                    dotIndex === safeIndex
                      ? "w-8 bg-[color:var(--color-action-primary)]"
                      : "w-2.5 bg-[color:var(--color-border-panel-soft)] hover:bg-[color:var(--color-text-soft)]"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleAutoScroll}
              disabled={!isCarouselReady}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--color-border-card)] bg-[color:var(--color-surface)] text-[color:var(--color-text-primary)] shadow-[0_8px_24px_rgba(var(--color-shadow-rgb),0.08)] transition hover:border-[color:var(--color-action-primary)] hover:text-[color:var(--color-action-primary)]"
              aria-pressed={isAutoScrollPlaying}
              aria-label={
                isAutoScrollPlaying
                  ? "Pause auto-scroll"
                  : "Resume auto-scroll"
              }
            >
              {isAutoScrollPlaying ? (
                <span aria-hidden="true" className="flex items-center gap-1">
                  <span className="block h-4 w-1.5 rounded-full bg-current" />
                  <span className="block h-4 w-1.5 rounded-full bg-current" />
                </span>
              ) : (
                <span
                  aria-hidden="true"
                  className="ml-0.5 block h-0 w-0 border-y-[8px] border-y-transparent border-l-[12px] border-l-current"
                />
              )}
            </button>
            <button
              type="button"
              onClick={showPrevious}
              disabled={!isCarouselReady}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--color-border-card)] bg-[color:var(--color-surface)] text-xl text-[color:var(--color-text-primary)] shadow-[0_8px_24px_rgba(var(--color-shadow-rgb),0.08)] transition hover:border-[color:var(--color-action-primary)] hover:text-[color:var(--color-action-primary)]"
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={showNext}
              disabled={!isCarouselReady}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--color-border-card)] bg-[color:var(--color-surface)] text-xl text-[color:var(--color-text-primary)] shadow-[0_8px_24px_rgba(var(--color-shadow-rgb),0.08)] transition hover:border-[color:var(--color-action-primary)] hover:text-[color:var(--color-action-primary)]"
              aria-label="Next photo"
            >
              ›
            </button>
          </div>
        </div>
      ) : null}
      {isLightboxOpen && activeLightboxPhoto ? (
        <div
          className="fixed inset-0 z-[1200] bg-[rgba(8,15,26,0.9)] backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} photo viewer`}
          onClick={closeLightbox}
        >
          <div className="flex h-full flex-col">
            <div
              className="flex items-center justify-between gap-3 border-b border-[color:var(--color-border-panel)] px-4 py-4 sm:px-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-text-soft)]">
                  Photo Viewer
                </p>
                <p className="truncate text-sm text-[color:var(--color-text-primary)]">
                  {title} {lightboxIndex + 1} / {photoCount}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateLightboxZoom(lightboxZoom - 0.5)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--color-border-panel)] bg-[rgba(var(--color-surface-rgb),0.08)] text-xl text-[color:var(--color-text-primary)] transition hover:bg-[rgba(var(--color-surface-rgb),0.14)]"
                  aria-label="Zoom out"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => updateLightboxZoom(1)}
                  className="rounded-full border border-[color:var(--color-border-panel)] bg-[rgba(var(--color-surface-rgb),0.08)] px-3 py-2 text-xs font-semibold tracking-[0.16em] text-[color:var(--color-text-primary)] transition hover:bg-[rgba(var(--color-surface-rgb),0.14)]"
                  aria-label="Reset zoom"
                >
                  {Math.round(lightboxZoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => updateLightboxZoom(lightboxZoom + 0.5)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--color-border-panel)] bg-[rgba(var(--color-surface-rgb),0.08)] text-xl text-[color:var(--color-text-primary)] transition hover:bg-[rgba(var(--color-surface-rgb),0.14)]"
                  aria-label="Zoom in"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={closeLightbox}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--color-border-panel)] bg-[rgba(var(--color-surface-rgb),0.08)] text-xl text-[color:var(--color-text-primary)] transition hover:bg-[rgba(var(--color-surface-rgb),0.14)]"
                  aria-label="Close photo viewer"
                >
                  ×
                </button>
              </div>
            </div>

            <div
              className="flex min-h-0 flex-1 items-center justify-center px-3 py-4 sm:px-6 sm:py-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="relative flex h-full w-full items-center justify-center overflow-auto rounded-[2rem] border border-[color:var(--color-border-panel)] bg-[rgba(var(--color-overlay-rgb),0.42)]">
                <button
                  type="button"
                  onClick={showLightboxPrevious}
                  className={`absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-[color:var(--color-border-panel)] bg-[rgba(var(--color-overlay-rgb),0.72)] px-4 py-3 text-2xl text-[color:var(--color-text-primary)] transition hover:bg-[rgba(var(--color-overlay-rgb),0.9)] ${photoCount > 1 ? "" : "hidden"}`}
                  aria-label="Previous photo"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={showLightboxNext}
                  className={`absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-[color:var(--color-border-panel)] bg-[rgba(var(--color-overlay-rgb),0.72)] px-4 py-3 text-2xl text-[color:var(--color-text-primary)] transition hover:bg-[rgba(var(--color-overlay-rgb),0.9)] ${photoCount > 1 ? "" : "hidden"}`}
                  aria-label="Next photo"
                >
                  ›
                </button>

                <LoadingImage
                  src={activeLightboxPhoto}
                  alt={`${title} photo ${lightboxIndex + 1}`}
                  width={2000}
                  height={1400}
                  onClick={() =>
                    updateLightboxZoom(lightboxZoom > 1 ? 1 : 2)
                  }
                  onWheel={(event) => {
                    event.preventDefault();
                    updateLightboxZoom(
                      lightboxZoom + (event.deltaY < 0 ? 0.25 : -0.25),
                    );
                  }}
                  className="h-auto max-h-none w-auto max-w-none cursor-zoom-in object-contain transition-transform duration-200"
                  style={{
                    maxWidth: lightboxZoom === 1 ? "min(92vw, 1400px)" : "none",
                    maxHeight: lightboxZoom === 1 ? "min(78vh, 920px)" : "none",
                    transform: `scale(${lightboxZoom})`,
                    transformOrigin: "center center",
                  }}
                  skeletonClassName="bg-[image:var(--gradient-loading-slate)]"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getAutoScrollPlugin(
  emblaApi: NonNullable<ReturnType<typeof useEmblaCarousel>[1]>,
) {
  return emblaApi.plugins().autoScroll;
}
