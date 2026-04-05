"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { MapPin, Navigation, X } from "lucide-react";
import type { Building } from "@/lib/types";
import DispenserImageSlider from "@/components/ui/DispenserImageSlider";
import { ColdWaterBadge, MaintenanceBadge } from "./StatusBadge";

interface SidebarProps {
  building: Building | null;
  onClose: () => void;
  userLocation: { lat: number; lng: number } | null;
}

type MobileSnap = "peek" | "half" | "full";

type SheetMetrics = {
  fullHeight: number;
  peekHeight: number;
  halfHeight: number;
};

type DragState = {
  active: boolean;
  pointerId: number | null;
  startY: number;
  startTranslate: number;
};

const DEFAULT_SNAP: MobileSnap = "half";
const DEFAULT_METRICS: SheetMetrics = {
  fullHeight: 620,
  peekHeight: 188,
  halfHeight: 364,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getSnapTranslate(snap: MobileSnap, metrics: SheetMetrics) {
  if (snap === "full") {
    return 0;
  }

  if (snap === "half") {
    return metrics.fullHeight - metrics.halfHeight;
  }

  return metrics.fullHeight - metrics.peekHeight;
}

function buildMetrics(viewportHeight: number): SheetMetrics {
  const topGap = clamp(viewportHeight * 0.12, 84, 144);
  const fullHeight = Math.max(320, viewportHeight - topGap);
  const peekHeight = clamp(viewportHeight * 0.24, 166, 228);

  let halfHeight = clamp(viewportHeight * 0.56, 300, fullHeight - 56);
  halfHeight = Math.max(halfHeight, Math.min(fullHeight - 56, peekHeight + 96));
  halfHeight = Math.min(halfHeight, fullHeight - 56);

  return {
    fullHeight,
    peekHeight,
    halfHeight,
  };
}

function openDirections(building: Building, userLocation: { lat: number; lng: number } | null) {
  const destination = `${building.latitude},${building.longitude}`;
  const origin = userLocation ? `${userLocation.lat},${userLocation.lng}` : "My+Location";
  const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking`;

  window.open(url, "_blank", "noopener,noreferrer");
}

function stationCountLabel(building: Building) {
  return `${building.dispensers.length} station${building.dispensers.length !== 1 ? "s" : ""} listed in this building`;
}

function DirectionsButton({
  building,
  userLocation,
  compact = false,
}: {
  building: Building;
  userLocation: { lat: number; lng: number } | null;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => openDirections(building, userLocation)}
      className={`group flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand-600)] px-4 text-sm font-bold tracking-wide text-white shadow-[0_16px_28px_-20px_rgba(67,26,124,0.9)] transition hover:bg-[var(--brand-700)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] active:scale-[0.99] md:text-base ${
        compact ? "py-3" : "py-3.5"
      }`}
    >
      <Navigation className="h-4 w-4 text-white/90 transition group-hover:text-white" />
      Get Walking Directions
    </button>
  );
}

function DispenserList({ building }: { building: Building }) {
  return (
    <div className="space-y-4 px-4 py-4 md:px-5 md:py-5">
      {building.dispensers.map((dispenser) => (
        <article
          key={`${building.id}:${dispenser.id}`}
          className="rounded-2xl border border-[#d8cdea] bg-white px-4 py-4 shadow-[0_14px_28px_-30px_rgba(67,26,124,0.65)] transition hover:border-[#b79adf] md:px-5"
        >
          <DispenserImageSlider
            imageUrls={dispenser.imageUrls}
            alt={`${dispenser.locationDescription} dispenser`}
            emptyLabel="No Image"
            className="relative mb-3 aspect-square w-full overflow-hidden rounded-xl border border-[#e2d8f0] bg-[#f8f3ff]"
            imageClassName="h-full w-full object-cover"
            emptyClassName="mb-3 flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-[#d8cdea] bg-[#f8f3ff] text-xs font-semibold tracking-wide text-[#6c5f84] uppercase"
          />
          <h3 className="text-lg leading-snug font-bold text-[#281947] md:text-xl">
            {dispenser.locationDescription}
          </h3>

          <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
            <dt className="font-semibold text-[#4a3a66]">Brand</dt>
            <dd className="text-right font-bold text-[#301a55]">{dispenser.brand}</dd>
          </dl>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-[#e2d8f0] pt-3">
            <MaintenanceBadge status={dispenser.maintenanceStatus} />
            <ColdWaterBadge status={dispenser.coldWaterStatus} />
          </div>
        </article>
      ))}

      {building.dispensers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#d8cdea] bg-[#f8f3ff] px-5 py-8 text-center">
          <p className="font-semibold text-[#4a3a66]">
            No dispenser records are available for this building yet.
          </p>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ building, onClose, userLocation }: SidebarProps) {
  const [mobileSnap, setMobileSnap] = useState<MobileSnap>(DEFAULT_SNAP);
  const [metrics, setMetrics] = useState<SheetMetrics>(DEFAULT_METRICS);
  const [dragTranslate, setDragTranslate] = useState<number | null>(null);
  const dragRef = useRef<DragState>({
    active: false,
    pointerId: null,
    startY: 0,
    startTranslate: 0,
  });

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(buildMetrics(window.innerHeight));
    };

    updateMetrics();
    window.addEventListener("resize", updateMetrics);

    return () => {
      window.removeEventListener("resize", updateMetrics);
    };
  }, []);

  const snapTranslate = useMemo(
    () => getSnapTranslate(mobileSnap, metrics),
    [mobileSnap, metrics]
  );

  const isDragging = dragTranslate !== null;
  const effectiveTranslate = dragTranslate ?? snapTranslate;
  const isPeek = mobileSnap === "peek" && !isDragging;

  const finishDrag = (pointerEvent: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== pointerEvent.pointerId) {
      return;
    }

    const currentTranslate = clamp(
      drag.startTranslate + (pointerEvent.clientY - drag.startY),
      -28,
      metrics.fullHeight + 140
    );

    dragRef.current = {
      active: false,
      pointerId: null,
      startY: 0,
      startTranslate: 0,
    };

    if (pointerEvent.currentTarget.hasPointerCapture(pointerEvent.pointerId)) {
      pointerEvent.currentTarget.releasePointerCapture(pointerEvent.pointerId);
    }

    const peekTranslate = getSnapTranslate("peek", metrics);
    if (mobileSnap === "peek" && currentTranslate > peekTranslate + 88) {
      setDragTranslate(null);
      onClose();
      return;
    }

    const translated = Math.max(0, currentTranslate);
    const candidates: Array<{ snap: MobileSnap; value: number }> = [
      { snap: "full", value: getSnapTranslate("full", metrics) },
      { snap: "half", value: getSnapTranslate("half", metrics) },
      { snap: "peek", value: peekTranslate },
    ];

    let nextSnap: MobileSnap = "half";
    let minDistance = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
      const distance = Math.abs(translated - candidate.value);
      if (distance < minDistance) {
        minDistance = distance;
        nextSnap = candidate.snap;
      }
    }

    setMobileSnap(nextSnap);
    setDragTranslate(null);
  };

  const onDragStart = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startY: event.clientY,
      startTranslate: snapTranslate,
    };
    setDragTranslate(snapTranslate);
  };

  const onDragMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) {
      return;
    }

    const nextTranslate = clamp(
      drag.startTranslate + (event.clientY - drag.startY),
      -28,
      metrics.fullHeight + 140
    );
    setDragTranslate(nextTranslate);
  };

  const onDragEnd = (event: PointerEvent<HTMLDivElement>) => {
    finishDrag(event);
  };

  const onDragCancel = (event: PointerEvent<HTMLDivElement>) => {
    finishDrag(event);
  };

  const onHandleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setMobileSnap((current) => (current === "peek" ? "half" : "full"));
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (mobileSnap === "peek") {
        onClose();
        return;
      }

      setMobileSnap((current) => (current === "full" ? "half" : "peek"));
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setMobileSnap((current) => {
        if (current === "peek") {
          return "half";
        }

        if (current === "half") {
          return "full";
        }

        return "peek";
      });
    }
  };

  const mobileSnapLabel =
    mobileSnap === "full"
      ? "expanded"
      : mobileSnap === "half"
        ? "half expanded"
        : "collapsed";

  if (!building) {
    return null;
  }

  return (
    <>
      <aside
        className="fixed inset-x-0 bottom-0 z-[2000] md:hidden"
        style={{
          height: `${metrics.fullHeight}px`,
          transform: `translateY(${effectiveTranslate}px)`,
          transition: isDragging
            ? "none"
            : "transform 420ms cubic-bezier(0.22,1,0.36,1)",
          willChange: "transform",
        }}
      >
        <div className="relative flex h-full flex-col overflow-hidden rounded-t-[30px] border-t border-[#d2c4e6] bg-white shadow-[0_-18px_45px_-26px_rgba(67,26,124,0.7)]">
          <div
            role="button"
            tabIndex={0}
            aria-label={`Drag building details sheet, currently ${mobileSnapLabel}`}
            className="cursor-grab select-none border-b border-[#d8cdea] bg-gradient-to-b from-[#f6f0ff] to-white px-5 pt-2 pb-3 active:cursor-grabbing"
            style={{ touchAction: "none" }}
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragCancel}
            onKeyDown={onHandleKeyDown}
          >
            <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-[#d9cfee]" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#d8cdea] bg-white px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] text-[#5a2c93] uppercase">
                  <MapPin className="h-3 w-3" />
                  Selected Building
                </p>
                <h2 className="font-display text-[1.7rem] leading-tight font-bold text-[#301a55]">
                  {building.name}
                </h2>
                <p className="mt-1.5 text-sm font-semibold text-[#4a3a66]">
                  {stationCountLabel(building)}
                </p>
                <div className="mt-3">
                  <DirectionsButton building={building} userLocation={userLocation} compact />
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                onPointerDown={(event) => event.stopPropagation()}
                aria-label="Close building details sheet"
                className="shrink-0 rounded-full border border-[#d8cdea] bg-white p-2 text-[#4a3a66] transition hover:border-[#9c7ccc] hover:text-[#5a2c93] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!isPeek && (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <DispenserList building={building} />
              <div
                aria-hidden="true"
                style={{ height: `${Math.max(0, effectiveTranslate)}px` }}
              />
            </div>
          )}
        </div>
      </aside>

      <aside className="fixed top-0 left-0 z-[2000] hidden h-full w-[min(26rem,92vw)] border-r border-[#d2c4e6] bg-white shadow-[0_18px_45px_-28px_rgba(67,26,124,0.7)] md:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-[#d8cdea] bg-gradient-to-b from-[#f6f0ff] to-white px-6 pt-6 pb-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#d8cdea] bg-white px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] text-[#5a2c93] uppercase">
                  <MapPin className="h-3 w-3" />
                  Selected Building
                </p>
                <h2 className="font-display text-[1.75rem] leading-tight font-bold text-[#301a55]">
                  {building.name}
                </h2>
                <p className="mt-2 text-sm font-semibold text-[#4a3a66]">
                  {stationCountLabel(building)}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close building details"
                className="rounded-full border border-[#d8cdea] bg-white p-2 text-[#4a3a66] transition hover:border-[#9c7ccc] hover:text-[#5a2c93] active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-28">
            <DispenserList building={building} />
          </div>

          <div className="absolute right-0 bottom-0 left-0 border-t border-[#d8cdea] bg-white p-5">
            <DirectionsButton building={building} userLocation={userLocation} />
          </div>
        </div>
      </aside>
    </>
  );
}
