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
    name: "Desasiwa Restu M01",
    latitude: 5.356019667609643,
    longitude: 100.28920639408403,
    dispensers: [
      {
        id: "dsp-1",
        buildingId: "bld-1",
        locationDescription: "1st Floor, Pantry",
        brand: "Coway",
        modelName: "Core",
        coldWaterStatus: "Available",
        maintenanceStatus: "Operational"
      },
      {
        id: "dsp-2",
        buildingId: "bld-1",
        locationDescription: "3rd Floor, Pantry",
        brand: "Cuckoo",
        modelName: "King Top",
        coldWaterStatus: "Unavailable",
        maintenanceStatus: "Under Maintenance"
      },
      {
        id: "dsp-3",
        buildingId: "bld-1",
        locationDescription: "5th Floor, Pantry",
        brand: "Cuckoo",
        modelName: "King Top",
        coldWaterStatus: "Unavailable",
        maintenanceStatus: "Under Maintenance"
      },
      {
        id: "dsp-4",
        buildingId: "bld-1",
        locationDescription: "7th Floor, Pantry",
        brand: "Cuckoo",
        modelName: "King Top",
        coldWaterStatus: "Unavailable",
        maintenanceStatus: "Under Maintenance"
      },
      {
        id: "dsp-5",
        buildingId: "bld-1",
        locationDescription: "9th Floor, Pantry",
        brand: "Cuckoo",
        modelName: "King Top",
        coldWaterStatus: "Unavailable",
        maintenanceStatus: "Under Maintenance"
      }
    ]
  },
  {
    id: "bld-2",
    name: "School of Computer Sciences",
    latitude: 5.354544421429285,
    longitude: 100.30136801786983,
    dispensers: [
      {
        id: "dsp-3",
        buildingId: "bld-2",
        locationDescription: "Pantry CS",
        brand: "Cuckoo",
        modelName: "Pok hang",
        coldWaterStatus: "Available",
        maintenanceStatus: "Operational"
      }
    ]
  },
  {
    id: "bld-3",
    name: "Cafeteria Bakti",
    latitude: 5.357748113174808,
    longitude: 100.30055098305601,
    dispensers: [
      {
        id: "dsp-4",
        buildingId: "bld-3",
        locationDescription: "2nd Floor Cafe, near Surau",
        brand: "Coway",
        modelName: "Neo Plus",
        coldWaterStatus: "Available",
        maintenanceStatus: "Operational"
      }

    ]
  },
  {
    id: "bld-4",
    name: "Bangunan KOMCA",
    latitude: 5.3596954466948725,
    longitude: 100.30214372647505,
    dispensers: [
      {
        id: "dsp-6",
        buildingId: "bld-4",
        locationDescription: "Level 2, In front of MPP Room",
        brand: "Cuckoo",
        modelName: "Icon",
        coldWaterStatus: "Available",
        maintenanceStatus: "Operational"
      }
    ]
  },
  {
    id: "bld-5",
    name: "School of Social Science",
    latitude: 5.358474709308763,
    longitude: 100.30460688274864,
    dispensers: [
      {
        id: "dsp-6",
        buildingId: "bld-5",
        locationDescription: "PPSK Student Lounge",
        brand: "Cuckoo",
        modelName: "Icon",
        coldWaterStatus: "Available",
        maintenanceStatus: "Operational"
      }
    ]
  },
];
