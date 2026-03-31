import { Droplet } from "lucide-react";
import Image from "next/image";
import MapShell from "@/components/ui/MapShell";
import { getBuildings } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const buildings = await getBuildings();

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 z-[1]">
        <div className="absolute top-[-6rem] left-[-6rem] h-72 w-72 rounded-full bg-[var(--brand-400)]/20 blur-3xl" />
        <div className="absolute top-[-8rem] right-[-4rem] h-80 w-80 rounded-full bg-[var(--accent-500)]/10 blur-3xl" />
      </div>

      <div className="relative h-full w-full overflow-hidden">
        <header className="pointer-events-none absolute top-3 left-1/2 z-[1000] w-[min(95vw,46rem)] -translate-x-1/2 md:top-6">
          <div className="pointer-events-auto fade-in-up rounded-2xl border border-[#c8b8dd] bg-white px-4 py-3 shadow-[0_16px_40px_-28px_rgba(67,26,124,0.65)] md:px-5 md:py-4">
            <div className="flex flex-col items-center gap-3 text-center md:gap-4">
              <div className="flex h-16 w-[13.5rem] items-center justify-center overflow-hidden rounded-xl border border-[#d6cae7] bg-[#f7f2ff] px-2 md:h-[4.35rem] md:w-[15.5rem]">
                <Image
                  src="/usm-logo.png"
                  alt="School of Computer Sciences logo"
                  width={280}
                  height={104}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-[0.22em] text-[#5a2c93] uppercase md:text-[11px]">
                  Universiti Sains Malaysia
                </p>
                <h1 className="font-display text-2xl leading-tight font-black text-[#311a57] md:text-3xl">
                  Where&apos;s My Water?
                </h1>
                <p className="text-xs font-semibold tracking-wide text-[#4a3a66] md:text-sm">
                  Water Refill Locator for USM Main Campus
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#d9cfee] bg-[#f8f3ff] px-3 py-2 md:mt-4">
              <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-[#5f32a5] text-white shadow-sm">
                <Droplet className="absolute h-4 w-4 text-white/35 marker-pulse" />
                <Droplet className="relative z-10 h-3.5 w-3.5" />
              </div>
              <p className="text-[11px] font-semibold tracking-wide text-[#4a3a66] md:text-xs">
                Select a building marker to view nearby dispenser status and directions.
              </p>
            </div>
          </div>
        </header>

        <MapShell buildings={buildings} />
      </div>
    </main>
  );
}
