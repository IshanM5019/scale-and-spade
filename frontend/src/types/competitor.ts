export interface Competitor {
  id: string;
  user_id: string;
  name: string;
  website?: string;
  category?: string;
  region?: string;
  rating?: number;
  notes?: string;
  created_at: string;
}

export interface CompetitorCreate {
  name: string;
  website?: string;
  category?: string;
  region?: string;
  rating?: number;
  notes?: string;
}

export interface CompetitorAnalysisSummary {
  total_competitors: number;
  average_rating?: number;
  top_competitor?: string;
  categories: string[];
}
