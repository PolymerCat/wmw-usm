"use client";

import { MapPin, Navigation, X } from "lucide-react";
import type { Building } from "@/lib/types";
import { ColdWaterBadge, MaintenanceBadge } from "./StatusBadge";

interface SidebarProps {
  building: Building | null;
  onClose: () => void;
}

export default function NewSidebar({ building, onClose }: SidebarProps) {
  if (!building) {
    return null;
  }

  return (
    <aside
      className={`fixed bottom-0 left-0 z-[2000] h-[68vh] w-full rounded-t-[30px] border-t border-[#d2c4e6] bg-white shadow-[0_-18px_45px_-26px_rgba(67,26,124,0.7)] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] md:top-0 md:h-full md:w-[min(26rem,92vw)] md:rounded-none md:border-t-0 md:border-r md:shadow-[0_18px_45px_-28px_rgba(67,26,124,0.7)] ${
        building
          ? "translate-y-0"
          : "translate-y-full md:-translate-x-full md:translate-y-0"
      }`}
    >
      <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-[#d9cfee] md:hidden" />

      <div className="flex h-full flex-col">
        <div className="border-b border-[#d8cdea] bg-gradient-to-b from-[#f6f0ff] to-white px-5 pt-4 pb-4 md:px-6 md:pt-6 md:pb-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#d8cdea] bg-white px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] text-[#5a2c93] uppercase">
                <MapPin className="h-3 w-3" />
                Selected Building
              </p>
              <h2 className="font-display text-2xl leading-tight font-bold text-[#301a55] md:text-[1.75rem]">
                {building.name}
              </h2>
              <p className="mt-2 text-sm font-semibold text-[#4a3a66]">
                {building.dispensers.length} station
                {building.dispensers.length !== 1 ? "s" : ""} listed in this
                building
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

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 px-4 py-4 pb-28 md:px-5 md:py-5">
            {building.dispensers.map((dispenser) => (
              <article
                key={`${building.id}:${dispenser.id}`}
                className="rounded-2xl border border-[#d8cdea] bg-white px-4 py-4 shadow-[0_14px_28px_-30px_rgba(67,26,124,0.65)] transition hover:border-[#b79adf] md:px-5"
              >
                <h3 className="text-lg leading-snug font-bold text-[#281947] md:text-xl">
                  {dispenser.locationDescription}
                </h3>

                <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                  <dt className="font-semibold text-[#4a3a66]">Brand</dt>
                  <dd className="text-right font-bold text-[#301a55]">
                    {dispenser.brand}
                  </dd>
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
        </div>

        <div className="absolute bottom-0 left-0 w-full border-t border-[#d8cdea] bg-white p-4 md:relative md:p-5">
          <button
            type="button"
            onClick={() =>
              window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${building.latitude},${building.longitude}&travelmode=walking`,
                "_blank",
                "noopener,noreferrer"
              )
            }
            className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--brand-600)] to-[var(--brand-500)] px-4 py-3.5 text-sm font-bold tracking-wide text-white shadow-[0_16px_28px_-20px_rgba(67,26,124,0.9)] transition hover:from-[var(--brand-700)] hover:to-[var(--brand-600)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] active:scale-[0.99] md:text-base"
          >
            <Navigation className="h-4 w-4 text-[var(--accent-500)] transition group-hover:text-[var(--accent-500)]" />
            Get Walking Directions
          </button>
        </div>
      </div>
    </aside>
  );
}
