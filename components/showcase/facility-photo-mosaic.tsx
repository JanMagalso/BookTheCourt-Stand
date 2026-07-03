"use client";

import { useEffect, useRef, useState, type UIEvent } from "react";

import { LoadingImage } from "@/components/loading-image";

type FacilityPhotoMosaicProps = {
  photos: string[];
  title: string;
};

export function FacilityPhotoMosaic({ photos, title }: FacilityPhotoMosaicProps) {
  const cleanPhotos = photos.filter(Boolean);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(true);
  const mobileTrackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (cleanPhotos.length <= 1 || !isAutoPlayEnabled) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current === cleanPhotos.length - 1 ? 0 : current + 1));
    }, 4500);

    return () => window.clearInterval(interval);
  }, [cleanPhotos.length, isAutoPlayEnabled]);

  useEffect(() => {
    const track = mobileTrackRef.current;

    if (
      !track ||
      cleanPhotos.length <= 1 ||
      !window.matchMedia("(max-width: 767px)").matches
    ) {
      return;
    }

    const nextCard = track.children.item(activeIndex);
    if (!(nextCard instanceof HTMLElement)) {
      return;
    }

    const centeredLeft = Math.max(
      nextCard.offsetLeft - (track.clientWidth - nextCard.offsetWidth) / 2,
      0,
    );

    track.scrollTo({
      left: centeredLeft,
      behavior: "smooth",
    });
  }, [activeIndex, cleanPhotos.length]);

  if (cleanPhotos.length === 0) {
    return (
      <div className="flex h-[350px] items-center justify-center rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-semibold text-slate-400">
        No facility image yet
      </div>
    );
  }

  const safeIndex = activeIndex >= 0 && activeIndex < cleanPhotos.length ? activeIndex : 0;
  const activePhoto = cleanPhotos[safeIndex];

  const showPrevious = () => {
    setActiveIndex((current) => (current === 0 ? cleanPhotos.length - 1 : current - 1));
  };

  const showNext = () => {
    setActiveIndex((current) => (current === cleanPhotos.length - 1 ? 0 : current + 1));
  };

  const handleMobileGalleryScroll = (event: UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const cardWidth = container.firstElementChild instanceof HTMLElement
      ? container.firstElementChild.offsetWidth + 16
      : 0;

    if (!cardWidth) {
      return;
    }

    const nextIndex = Math.round(container.scrollLeft / cardWidth);
    if (nextIndex !== activeIndex && nextIndex >= 0 && nextIndex < cleanPhotos.length) {
      setActiveIndex(nextIndex);
    }
  };

  return (
    <div className="space-y-5">
      <div className="md:hidden">
        <div
          ref={mobileTrackRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={handleMobileGalleryScroll}
        >
          {cleanPhotos.map((photo, index) => (
            <button
              key={`${photo}-mobile-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className="relative w-[88vw] max-w-[420px] shrink-0 snap-center overflow-hidden rounded-[2rem] border border-[#d6e3ea] bg-slate-100 text-left shadow-[0_18px_40px_rgba(15,23,42,0.10)]"
            >
              <LoadingImage
                src={photo}
                alt={`${title} photo ${index + 1}`}
                width={1200}
                height={900}
                className="aspect-[4/5] w-full object-cover"
                skeletonClassName="bg-[linear-gradient(110deg,rgba(203,213,225,0.95),rgba(226,232,240,0.75),rgba(203,213,225,0.95))]"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(6,18,34,0.72))] px-4 pb-4 pt-14 text-white">
                <div className="flex items-center justify-center gap-2">
                  {cleanPhotos.map((dotPhoto, dotIndex) => (
                    <span
                      key={`${dotPhoto}-mobile-dot-${dotIndex}`}
                      className={`h-2.5 rounded-full ${
                        dotIndex === safeIndex ? "w-7 bg-white" : "w-2.5 bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="relative hidden overflow-hidden rounded-[2.2rem] border border-[#d6e3ea] bg-slate-100 shadow-[0_24px_80px_rgba(15,23,42,0.12)] md:block">
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4 sm:p-6">
          <span className="inline-flex items-center rounded-full border border-white/18 bg-black/28 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-white shadow-lg backdrop-blur-md">
            {safeIndex + 1} / {cleanPhotos.length}
          </span>
          {cleanPhotos.length > 1 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAutoPlayEnabled((current) => !current)}
                className={`inline-flex h-11 items-center justify-center rounded-full border px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md transition ${
                  isAutoPlayEnabled
                    ? "border-white/18 bg-black/28 hover:bg-black/42"
                    : "border-white/30 bg-[rgba(37,99,235,0.4)] hover:bg-[rgba(37,99,235,0.55)]"
                }`}
                aria-pressed={isAutoPlayEnabled}
                aria-label={isAutoPlayEnabled ? "Pause auto-rotate" : "Resume auto-rotate"}
              >
                {isAutoPlayEnabled ? "Pause Auto" : "Play Auto"}
              </button>
              <button
                type="button"
                onClick={showPrevious}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/18 bg-black/28 text-xl text-white backdrop-blur-md transition hover:bg-black/42"
                aria-label="Previous photo"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={showNext}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/18 bg-black/28 text-xl text-white backdrop-blur-md transition hover:bg-black/42"
                aria-label="Next photo"
              >
                ›
              </button>
            </div>
          ) : null}
        </div>

        <LoadingImage
          src={activePhoto}
          alt={`${title} photo ${safeIndex + 1}`}
          width={1600}
          height={1100}
          className="aspect-[16/9] w-full object-cover"
          skeletonClassName="bg-[linear-gradient(110deg,rgba(203,213,225,0.95),rgba(226,232,240,0.75),rgba(203,213,225,0.95))]"
        />

        <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(6,18,34,0.72))] px-5 pb-5 pt-24 text-white sm:px-6 sm:pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl rounded-[1.35rem] border border-white/10 bg-[rgba(7,18,32,0.18)] px-4 py-4 shadow-[0_12px_28px_rgba(0,0,0,0.14)] backdrop-blur-[6px]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/72 sm:text-xs sm:tracking-[0.28em]">
                On Court Energy
              </p>
              <p className="mt-2 text-[1.8rem] font-semibold leading-tight tracking-[-0.04em] sm:text-[2.4rem]">
                Visual cues that make booking feel alive.
              </p>
            </div>

            {cleanPhotos.length > 1 ? (
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/14 bg-black/24 px-3 py-2 backdrop-blur-md sm:self-auto">
                {cleanPhotos.map((photo, index) => (
                  <button
                    key={`${photo}-dot-${index}`}
                    type="button"
                    aria-label={`Show photo ${index + 1}`}
                    onClick={() => setActiveIndex(index)}
                    className={`h-2.5 rounded-full transition-all ${
                      index === safeIndex ? "w-8 bg-white" : "w-2.5 bg-white/45 hover:bg-white/72"
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {cleanPhotos.length > 1 ? (
        <div className="overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max gap-4">
            {cleanPhotos.map((photo, index) => (
              <button
                key={`${photo}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`group hidden overflow-hidden rounded-[1.5rem] border bg-white text-left transition md:block ${
                  index === safeIndex
                    ? "border-[#1f8d72] shadow-[0_18px_40px_rgba(31,141,114,0.18)]"
                    : "border-[#d8e4de] hover:border-[#9fc0b1]"
                }`}
              >
                <LoadingImage
                  src={photo}
                  alt={`${title} thumbnail ${index + 1}`}
                  width={420}
                  height={280}
                  className="h-40 w-[260px] object-cover transition-transform duration-300 group-hover:scale-105"
                  skeletonClassName="bg-[linear-gradient(110deg,rgba(203,213,225,0.95),rgba(226,232,240,0.75),rgba(203,213,225,0.95))]"
                />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
