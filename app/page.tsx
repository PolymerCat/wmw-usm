import Image from "next/image";
import MapShell from "@/components/ui/MapShell";
import { getBuildings } from "@/lib/data";

export const revalidate = 60;

export default async function HomePage() {
  const buildings = await getBuildings();

  return (
    <main className="relative h-screen min-h-[100svh] w-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 z-[1]">
        <div className="absolute top-[-6rem] left-[-6rem] h-72 w-72 rounded-full bg-[var(--brand-400)]/20 blur-3xl" />
        <div className="absolute top-[-8rem] right-[-4rem] h-80 w-80 rounded-full bg-[var(--accent-500)]/10 blur-3xl" />
      </div>

      <div className="relative h-full w-full overflow-hidden">
        <header className="pointer-events-none absolute top-2.5 left-1/2 z-[1000] w-[min(93vw,38rem)] -translate-x-1/2 md:top-4">
          <div className="fade-in-up origin-top scale-[0.88] rounded-2xl border border-[#c8b8dd] bg-white/96 px-3 py-2.5 shadow-[0_16px_34px_-28px_rgba(67,26,124,0.8)] sm:scale-95 md:scale-100 md:px-4 md:py-3">
            <div className="flex flex-col items-center gap-2.5 text-center md:gap-3">
              <div className="flex h-12 w-[11rem] items-center justify-center overflow-hidden rounded-xl border border-[#d6cae7] bg-[#f7f2ff] px-2 md:h-14 md:w-[13rem]">
                <Image
                  src="/usm-logoV2.png"
                  alt="School of Computer Sciences logo"
                  width={280}
                  height={104}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>

              <div className="min-w-0">
                <h1 className="font-display text-[1.85rem] leading-none font-black text-[#311a57] md:text-[2.55rem]">
                  Where&apos;s My Water?
                </h1>
                <p className="text-[12px] font-semibold tracking-wide text-[#4a3a66] md:text-[13px]">
                  Water Refill Locator for USM Main Campus
                </p>
              </div>
            </div>
          </div>
        </header>

        <MapShell buildings={buildings} />
      </div>
    </main>
  );
}
