"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Info, X } from "lucide-react";
import type { Building } from "@/lib/types";
import { findNearestBuildingWithDispenser } from "@/lib/nearest";
import Sidebar from "@/components/ui/Sidebar";

const Map = dynamic(() => import("@/components/ui/Map"), {
  ssr: false,
});

interface MapShellProps {
  buildings: Building[];
}

const FEEDBACK_FORM_URL = "https://forms.gle/A1aCaxL8UdDp7yod8";

export default function MapShell({ buildings }: MapShellProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const infoPanelId = useId();
  const infoControlRef = useRef<HTMLDivElement | null>(null);
  const nearestBuilding = useMemo(
    () => findNearestBuildingWithDispenser(userLocation, buildings),
    [buildings, userLocation]
  );
  const nearestBuildingName =
    nearestBuilding &&
    buildings.find((building) => building.id === nearestBuilding.buildingId)?.name;
  const roundedNearestDistance =
    nearestBuilding && Number.isFinite(nearestBuilding.distanceMeters)
      ? Math.max(1, Math.round(nearestBuilding.distanceMeters))
      : null;

  useEffect(() => {
    if (!isInfoOpen) {
      return;
    }

    const handleDocumentPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (infoControlRef.current?.contains(target)) {
        return;
      }

      setIsInfoOpen(false);
    };

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsInfoOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentPointerDown);
    document.addEventListener("touchstart", handleDocumentPointerDown);
    document.addEventListener("keydown", handleDocumentKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleDocumentPointerDown);
      document.removeEventListener("touchstart", handleDocumentPointerDown);
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, [isInfoOpen]);

  return (
    <>
      <div
        ref={infoControlRef}
        className="fixed z-[2100] left-auto top-52 right-2 md:top-[15.25rem] md:right-4"
      >
        <button
          type="button"
          aria-label="Open site information"
          aria-controls={infoPanelId}
          aria-expanded={isInfoOpen}
          onClick={() => setIsInfoOpen((open) => !open)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[#c8b8dd] bg-white/96 text-[#3f226c] shadow-[0_16px_30px_-20px_rgba(67,26,124,0.8)] transition hover:border-[#a98fd0] hover:text-[#532491] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] active:scale-95"
        >
          <Info className="h-5 w-5" />
        </button>

        {isInfoOpen && (
          <section
            id={infoPanelId}
            role="dialog"
            aria-modal="false"
            aria-labelledby={`${infoPanelId}-title`}
            className="absolute top-[calc(100%+0.6rem)] right-0 w-[min(21rem,88vw)] rounded-2xl border border-[#d8cdea] bg-white/98 p-4 shadow-[0_18px_38px_-22px_rgba(67,26,124,0.88)] backdrop-blur-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <h2
                id={`${infoPanelId}-title`}
                className="font-display text-[1.18rem] leading-tight font-bold text-[#311a57]"
              >
                About
              </h2>
              <button
                type="button"
                aria-label="Close site information"
                onClick={() => setIsInfoOpen(false)}
                className="rounded-full border border-[#d8cdea] bg-white p-1.5 text-[#4a3a66] transition hover:border-[#9c7ccc] hover:text-[#5a2c93] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-sm leading-relaxed font-semibold text-[#4a3a66]">
              "Where&apos;s My Water?" helps people find water refill stations across USM Main
              Campus. All water dispenser locations are added manually. Help us find more dispensers in USM!
            </p>
            
            <p className="mt-3 text-sm leading-relaxed font-semibold text-[#4a3a66]">
              Any enquiries: Please contact{" "}
              <a
              href="https://www.instagram.com/mppcs.usm/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#5a2c93] hover:text-[#7a3cc3] underline transition"
              >
              @mppcs.usm
              </a>
              {" "}on Instagram
            </p>

            <div className="mt-4 flex justify-center">
              <a
              href={FEEDBACK_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-[#b79adf] bg-[#f8f3ff] px-3.5 py-2 text-sm font-bold text-[#4d2288] transition hover:border-[#9c7ccc] hover:bg-[#f2e8ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
              Add a water station or give feedback
              </a>
            </div>
          </section>
        )}
      </div>

      {nearestBuilding && nearestBuildingName && roundedNearestDistance && (
        <div className="pointer-events-none absolute top-[8.85rem] left-1/2 z-[1050] w-[min(84vw,26rem)] -translate-x-1/2 sm:top-[9.2rem] sm:w-[min(88vw,30rem)] md:top-[12.5rem] md:w-[min(92vw,34rem)]">
          <div className="rounded-2xl border-2 border-[#0f766e] bg-white/98 px-4 py-2 text-center text-[13px] leading-tight font-extrabold text-[#0b3f3b] shadow-[0_18px_34px_-16px_rgba(6,110,101,0.9)] backdrop-blur-sm md:px-5 md:py-2.5 md:text-sm">
            Nearest dispenser: {nearestBuildingName} • {roundedNearestDistance} m
          </div>
        </div>
      )}
      <Sidebar
        key={selectedBuilding?.id ?? "sidebar-empty"}
        building={selectedBuilding}
        userLocation={userLocation}
        onClose={() => setSelectedBuilding(null)}
      />
      <div className="absolute inset-0 z-0">
        <Map
          buildings={buildings}
          selectedBuildingId={selectedBuilding?.id ?? null}
          nearestBuildingId={nearestBuilding?.buildingId ?? null}
          onBuildingSelect={setSelectedBuilding}
          userLocation={userLocation}
          onUserLocationChange={setUserLocation}
        />
      </div>
    </>
  );
}
