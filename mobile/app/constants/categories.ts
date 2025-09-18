export const CATEGORIES = [
  "Infrastructure",
  "Roads",
  "Water Supply",
  "Sanitation", 
  "Electricity",
  "Public Transport",
  "Parks & Recreation",
  "Waste Management",
  "Street Lighting",
  "Drainage",
  "Other",
];

export const CATEGORY_DEPARTMENT_MAPPING = {
  "Infrastructure": "Public Works Department",
  "Roads": "Public Works Department",
  "Water Supply": "Water Resources Department", 
  "Sanitation": "Health & Sanitation Department",
  "Electricity": "Electricity Board",
  "Public Transport": "Transport Department",
  "Parks & Recreation": "Parks & Recreation Department", 
  "Waste Management": "Waste Management Department",
  "Street Lighting": "Municipal Corporation",
  "Drainage": "Water Resources Department",
  "Other": "General Administration"
} as const;

export const CATEGORY_INFO = {
  "Infrastructure": {
    department: "Public Works Department",
    description: "Roads, bridges, public buildings, and general infrastructure",
    icon: "construct-outline" as const
  },
  "Roads": {
    department: "Public Works Department", 
    description: "Road maintenance, potholes, traffic signs, and road safety",
    icon: "car-outline" as const
  },
  "Water Supply": {
    department: "Water Resources Department",
    description: "Water availability, quality issues, and supply disruptions", 
    icon: "water-outline" as const
  },
  "Sanitation": {
    department: "Health & Sanitation Department",
    description: "Public toilets, cleanliness, and sanitation facilities",
    icon: "medical-outline" as const
  },
  "Electricity": {
    department: "Electricity Board", 
    description: "Power outages, electrical hazards, and meter issues",
    icon: "flash-outline" as const
  },
  "Public Transport": {
    department: "Transport Department",
    description: "Bus services, transportation facilities, and accessibility",
    icon: "bus-outline" as const
  },
  "Parks & Recreation": {
    department: "Parks & Recreation Department",
    description: "Parks maintenance, recreational facilities, and green spaces", 
    icon: "leaf-outline" as const
  },
  "Waste Management": {
    department: "Waste Management Department",
    description: "Garbage collection, disposal, and recycling issues",
    icon: "trash-outline" as const
  },
  "Street Lighting": {
    department: "Municipal Corporation",
    description: "Street lights, public lighting, and electrical safety",
    icon: "bulb-outline" as const
  },
  "Drainage": {
    department: "Water Resources Department", 
    description: "Waterlogging, sewage, and drainage system issues",
    icon: "water-outline" as const
  },
  "Other": {
    department: "General Administration",
    description: "Issues that don't fit into specific categories",
    icon: "help-circle-outline" as const
  }
};

export function getCategoryDepartment(category: string): string | null {
  return CATEGORY_DEPARTMENT_MAPPING[category as keyof typeof CATEGORY_DEPARTMENT_MAPPING] || null;
}

export function getCategoryInfo(category: string) {
  return CATEGORY_INFO[category as keyof typeof CATEGORY_INFO] || null;
}
