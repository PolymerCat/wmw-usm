"use client";

import Image from "next/image";
import { type KeyboardEvent, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DispenserImageSliderProps {
  imageUrls: string[];
  alt: string;
  emptyLabel: string;
  className: string;
  imageClassName: string;
  emptyClassName: string;
  sizes?: string;
}

const DEFAULT_IMAGE_SIZES = "(min-width: 768px) 24rem, 92vw";

function clampIndex(index: number, length: number) {
  if (length === 0) {
    return 0;
  }

  if (index < 0) {
    return length - 1;
  }

  if (index >= length) {
    return 0;
  }

  return index;
}

function isNeighborIndex(index: number, currentIndex: number, length: number) {
  return (
    index === clampIndex(currentIndex - 1, length) ||
    index === clampIndex(currentIndex + 1, length)
  );
}

export default function DispenserImageSlider({
  imageUrls,
  alt,
  emptyLabel,
  className,
  imageClassName,
  emptyClassName,
  sizes = DEFAULT_IMAGE_SIZES,
}: DispenserImageSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadedUrls, setLoadedUrls] = useState<Record<string, true>>({});
  const trackRef = useRef<HTMLDivElement | null>(null);
  const regionId = useId();
  const hasImages = imageUrls.length > 0;
  const hasMultiple = imageUrls.length > 1;
  const currentIndex = clampIndex(activeIndex, imageUrls.length);
  // Preload neighbours only after the visible image is in, so off-screen cards stay lazy.
  const isCurrentLoaded = Boolean(loadedUrls[imageUrls[currentIndex]]);

  const goTo = (index: number) => {
    const nextIndex = clampIndex(index, imageUrls.length);
    setActiveIndex(nextIndex);

    const track = trackRef.current;
    if (track && typeof track.scrollTo === "function") {
      track.scrollTo({ left: nextIndex * track.clientWidth, behavior: "smooth" });
    }
  };

  const goToPrevious = () => {
    goTo(currentIndex - 1);
  };

  const goToNext = () => {
    goTo(currentIndex + 1);
  };

  // Keeps the dots in sync with native swiping. Scroll events already fire at most once
  // per frame, and React skips the render when the index has not changed.
  const handleScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) {
      return;
    }

    setActiveIndex(
      clampIndex(Math.round(track.scrollLeft / track.clientWidth), imageUrls.length)
    );
  };

  const markLoaded = (url: string) => {
    setLoadedUrls((current) => (current[url] ? current : { ...current, [url]: true }));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!hasMultiple) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToPrevious();
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      goToNext();
    }
  };

  if (!hasImages) {
    return (
      <div className={emptyClassName} aria-label={emptyLabel}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <div
      className={className}
      tabIndex={hasMultiple ? 0 : -1}
      onKeyDown={handleKeyDown}
      aria-roledescription={hasMultiple ? "carousel" : undefined}
      aria-label={`${alt} images`}
      aria-describedby={hasMultiple ? regionId : undefined}
    >
      <div
        ref={trackRef}
        onScroll={hasMultiple ? handleScroll : undefined}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {imageUrls.map((url, index) => {
          const isLoaded = Boolean(loadedUrls[url]);
          const shouldPreload =
            hasMultiple && isCurrentLoaded && isNeighborIndex(index, currentIndex, imageUrls.length);

          return (
            <div
              key={url}
              className="relative h-full w-full shrink-0 snap-center snap-always"
              aria-roledescription={hasMultiple ? "slide" : undefined}
              aria-label={hasMultiple ? `${index + 1} of ${imageUrls.length}` : undefined}
            >
              {!isLoaded && (
                <div aria-hidden="true" className="absolute inset-0 animate-pulse bg-[#ece3f8]" />
              )}
              <Image
                src={url}
                alt={alt}
                fill
                sizes={sizes}
                loading={shouldPreload ? "eager" : "lazy"}
                draggable={false}
                onLoad={() => markLoaded(url)}
                className={`${imageClassName} transition-opacity duration-300 ${
                  isLoaded ? "opacity-100" : "opacity-0"
                }`}
              />
            </div>
          );
        })}
      </div>

      {hasMultiple ? (
        <>
          <button
            type="button"
            onClick={goToPrevious}
            aria-label="Previous dispenser image"
            className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full border border-[#d8cdea] bg-white/90 p-1 text-[#4a2d76] transition hover:bg-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goToNext}
            aria-label="Next dispenser image"
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full border border-[#d8cdea] bg-white/90 p-1 text-[#4a2d76] transition hover:bg-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div
            id={regionId}
            className="pointer-events-none absolute right-0 bottom-2 left-0 flex items-center justify-center gap-1"
          >
            {imageUrls.map((url, index) => (
              <button
                key={url}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`View dispenser image ${index + 1}`}
                aria-current={index === currentIndex ? "true" : undefined}
                className={`pointer-events-auto h-1.5 w-1.5 rounded-full transition ${
                  index === currentIndex ? "bg-white" : "bg-white/55"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
