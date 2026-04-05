"use client";

import { type KeyboardEvent, useId, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DispenserImageSliderProps {
  imageUrls: string[];
  alt: string;
  emptyLabel: string;
  className: string;
  imageClassName: string;
  emptyClassName: string;
}

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

export default function DispenserImageSlider({
  imageUrls,
  alt,
  emptyLabel,
  className,
  imageClassName,
  emptyClassName,
}: DispenserImageSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const regionId = useId();
  const hasImages = imageUrls.length > 0;
  const hasMultiple = imageUrls.length > 1;
  const currentIndex = clampIndex(activeIndex, imageUrls.length);

  const goToPrevious = () => {
    setActiveIndex((current) => clampIndex(current - 1, imageUrls.length));
  };

  const goToNext = () => {
    setActiveIndex((current) => clampIndex(current + 1, imageUrls.length));
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrls[currentIndex]} alt={alt} className={imageClassName} />

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
            {imageUrls.map((_, index) => (
              <button
                key={`${alt}:${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`View dispenser image ${index + 1}`}
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
