export type ColdWaterStatus = 'Available' | 'Unavailable' | 'Unknown';
export type MaintenanceStatus = 'Operational' | 'Under Maintenance' | 'Broken';

export interface Dispenser {
  id: string;
  buildingId: string;
  locationDescription: string;
  brand: string;
  modelName: string;
  coldWaterStatus: ColdWaterStatus;
  maintenanceStatus: MaintenanceStatus;
}

export interface Building {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  dispensers: Dispenser[];
}

export const BUILDINGS_DATA: Building[] = [
  {
    id: "bld-1",
    name: "Perpustakaan Hamzah Sendut (PHS)",
    latitude: 5.35412,
    longitude: 100.30138,
    dispensers: [
      {
        id: "dsp-1",
        buildingId: "bld-1",
        locationDescription: "Ground Floor, near entrance",
        brand: "Coway",
        modelName: "Core",
        coldWaterStatus: "Available",
        maintenanceStatus: "Operational"
      },
      {
        id: "dsp-2",
        buildingId: "bld-1",
        locationDescription: "Level 2, reading area",
        brand: "Cuckoo",
        modelName: "King Top",
        coldWaterStatus: "Unavailable",
        maintenanceStatus: "Under Maintenance"
      }
    ]
  },
  {
    id: "bld-2",
    name: "Kompleks Eureka",
    latitude: 5.36190,
    longitude: 100.30396,
    dispensers: [
      {
        id: "dsp-3",
        buildingId: "bld-2",
        locationDescription: "Lobby Area",
        brand: "Panasonic",
        modelName: "Water Purifier TK-CS20",
        coldWaterStatus: "Unknown",
        maintenanceStatus: "Operational"
      }
    ]
  },
  {
    id: "bld-3",
    name: "Foyer Dewan Kuliah (DK G)",
    latitude: 5.35759,
    longitude: 100.29824,
    dispensers: [
      {
        id: "dsp-4",
        buildingId: "bld-3",
        locationDescription: "Side entrance facing Cafe",
        brand: "Coway",
        modelName: "Neo Plus",
        coldWaterStatus: "Available",
        maintenanceStatus: "Operational"
      },
      {
        id: "dsp-5",
        buildingId: "bld-3",
        locationDescription: "Back corridor",
        brand: "Generic",
        modelName: "Unknown",
        coldWaterStatus: "Unavailable",
        maintenanceStatus: "Broken"
      }
    ]
  },
  {
    id: "bld-4",
    name: "Pusat Sejahtera (Klinik USM)",
    latitude: 5.35245,
    longitude: 100.30012,
    dispensers: [
      {
        id: "dsp-6",
        buildingId: "bld-4",
        locationDescription: "Waiting Area",
        brand: "Cuckoo",
        modelName: "Icon",
        coldWaterStatus: "Available",
        maintenanceStatus: "Operational"
      }
    ]
  }
];
