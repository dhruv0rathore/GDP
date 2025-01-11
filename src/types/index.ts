export interface CountryData {
  id: string;
  name: string;
  gdpData: GDPDataPoint[];
  leaders: Leader[];
}

export interface GDPDataPoint {
  year: number;
  value: number;
  growth: number;
}

export interface Leader {
  name: string;
  party: string;
  startYear: number;
  endYear: number;
  policies: string[];
}

export interface TimelineProps {
  countryData: CountryData[];
  selectedPeriod: [number, number];
  showGrowthRate: boolean;
  onExport: (data: CountryData) => void;
  comparisonMode?: boolean;
}

export interface ComparisonMetrics {
  startingRatio: number;
  endingRatio: number;
  averageGrowthDiff: number;
  overtakes: Array<{ year: number; country: string }>;
}