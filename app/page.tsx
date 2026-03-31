import { Droplet } from "lucide-react";
import MapShell from "@/components/ui/MapShell";
import { getBuildings } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const buildings = await getBuildings();

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-50">
      <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-slate-50 md:flex-row">
        <div className="absolute top-4 left-4 z-[1000] flex items-center gap-3 rounded-2xl border border-white/20 bg-white/90 px-4 py-3 shadow-lg backdrop-blur-xl md:top-6 md:left-6">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 shadow-inner">
            <Droplet className="absolute h-5 w-5 animate-ping text-white opacity-30" />
            <Droplet className="relative z-10 h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="bg-gradient-to-r from-blue-700 to-cyan-500 bg-clip-text text-xl leading-none font-extrabold tracking-tight text-transparent">
              Where&apos;s My Water?
            </h1>
            <p className="mt-1 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              USM MAIN CAMPUS
            </p>
          </div>
        </div>

        <MapShell buildings={buildings} />
      </div>
    </main>
  );
}
