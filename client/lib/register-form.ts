export const COMPANIES = [
  "Golf Adds",
  "Outdoor Network",
  "Airport",
  "Digital",
] as const;

// Companies not listed here have no elements (for now)
export const ELEMENTS_BY_COMPANY: Record<string, string[]> = {
  "Golf Adds": ["Billboard", "TV", "Ball washer", "Clock"],
  "Outdoor Network": ["Billboard"],
  Airport: ["Billboard"],
  Digital: ["Billboard"],
};

export const elementsFor = (company: string) =>
  ELEMENTS_BY_COMPANY[company] ?? [];
