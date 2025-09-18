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

export const DEFAULT_DEPARTMENTS = [
  {
    name: "Public Works Department",
    description: "Handles infrastructure development, road construction and maintenance, and general public works projects.",
    headOfDepartment: "PWD Commissioner",
    contactEmail: "pwd@samadhan.gov.in",
    contactPhone: "+91-9876543210"
  },
  {
    name: "Water Resources Department", 
    description: "Manages water supply, drainage systems, and water resource management across the city.",
    headOfDepartment: "Water Resources Commissioner",
    contactEmail: "water@samadhan.gov.in",
    contactPhone: "+91-9876543211"
  },
  {
    name: "Health & Sanitation Department",
    description: "Oversees public health initiatives, sanitation services, and hygiene management.",
    headOfDepartment: "Health Commissioner",
    contactEmail: "health@samadhan.gov.in", 
    contactPhone: "+91-9876543212"
  },
  {
    name: "Electricity Board",
    description: "Manages electrical infrastructure, power distribution, and electrical safety across the region.",
    headOfDepartment: "Chief Electrical Engineer",
    contactEmail: "electricity@samadhan.gov.in",
    contactPhone: "+91-9876543213"
  },
  {
    name: "Transport Department",
    description: "Handles public transportation systems, traffic management, and transport infrastructure.",
    headOfDepartment: "Transport Commissioner", 
    contactEmail: "transport@samadhan.gov.in",
    contactPhone: "+91-9876543214"
  },
  {
    name: "Parks & Recreation Department",
    description: "Maintains public parks, recreational facilities, and green spaces throughout the city.",
    headOfDepartment: "Parks Commissioner",
    contactEmail: "parks@samadhan.gov.in",
    contactPhone: "+91-9876543215"
  },
  {
    name: "Waste Management Department", 
    description: "Manages waste collection, disposal, recycling programs, and cleanliness initiatives.",
    headOfDepartment: "Waste Management Commissioner",
    contactEmail: "waste@samadhan.gov.in",
    contactPhone: "+91-9876543216"
  },
  {
    name: "Municipal Corporation",
    description: "Handles street lighting, municipal services, and general city administration.", 
    headOfDepartment: "Municipal Commissioner",
    contactEmail: "municipal@samadhan.gov.in",
    contactPhone: "+91-9876543217"
  },
  {
    name: "General Administration",
    description: "Handles miscellaneous issues and coordinates between various departments.",
    headOfDepartment: "Administrative Officer",
    contactEmail: "admin@samadhan.gov.in",
    contactPhone: "+91-9876543218"
  }
];

export function getCategoryDepartment(category: string): string | null {
  return CATEGORY_DEPARTMENT_MAPPING[category as keyof typeof CATEGORY_DEPARTMENT_MAPPING] || null;
}
