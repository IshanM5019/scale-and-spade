import useSWR, { mutate } from "swr";
import apiClient from "@/lib/apiClient";
import type { Competitor, CompetitorCreate, CompetitorAnalysisSummary } from "@/types/competitor";
import { AxiosError } from "axios";

const fetcher = (url: string) => apiClient.get(url).then((r) => r.data);

// ── Mock data shown when not authenticated (demo / dev mode) ────────────────
const MOCK_COMPETITORS: Competitor[] = [
  {
    id: "mock-1",
    user_id: "demo",
    name: "GrowthMart India",
    website: "https://growthmart.in",
    category: "E-Commerce",
    region: "Mumbai",
    rating: 4.3,
    notes: "Flash sale every weekend — 15% off sitewide. Running Instagram reels with influencers.",
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-2",
    user_id: "demo",
    name: "QuickScale SaaS",
    website: "https://quickscale.io",
    category: "SaaS",
    region: "Bengaluru",
    rating: 4.1,
    notes: "Freemium model — free tier with 5 users. Aggressive LinkedIn content marketing.",
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-3",
    user_id: "demo",
    name: "DesiTech Solutions",
    website: "https://desitech.co",
    category: "IT Services",
    region: "Hyderabad",
    rating: 3.9,
    notes: "20% referral discount. Heavy WhatsApp Business campaign for leads.",
    created_at: new Date().toISOString(),
  },
];

const MOCK_SUMMARY: CompetitorAnalysisSummary = {
  total_competitors: 3,
  average_rating: 4.1,
  top_competitor: "GrowthMart India",
  categories: ["E-Commerce", "SaaS", "IT Services"],
};

function isAuthError(err: unknown): boolean {
  const status = (err as AxiosError)?.response?.status;
  return status === 401 || status === 403;
}

export function useCompetitors() {
  const { data, error, isLoading } = useSWR<Competitor[]>(
    "/api/v1/competitors/",
    fetcher,
    { shouldRetryOnError: false }
  );

  const unauthenticated = isAuthError(error);

  const addCompetitor = async (payload: CompetitorCreate) => {
    await apiClient.post("/api/v1/competitors/", payload);
    mutate("/api/v1/competitors/");
  };

  const deleteCompetitor = async (id: string) => {
    await apiClient.delete(`/api/v1/competitors/${id}`);
    mutate("/api/v1/competitors/");
  };

  const updateCompetitor = async (id: string, payload: Partial<CompetitorCreate>) => {
    await apiClient.put(`/api/v1/competitors/${id}`, payload);
    mutate("/api/v1/competitors/");
  };

  return {
    competitors: unauthenticated ? MOCK_COMPETITORS : (data ?? []),
    isLoading: !unauthenticated && isLoading,
    isError: !!error && !unauthenticated,
    unauthenticated,
    addCompetitor,
    deleteCompetitor,
    updateCompetitor,
  };
}

export function useCompetitorSummary() {
  const { data, error, isLoading } = useSWR(
    "/api/v1/competitors/analysis/summary",
    fetcher,
    { shouldRetryOnError: false }
  );
  const unauthenticated = isAuthError(error);
  return {
    summary: unauthenticated ? MOCK_SUMMARY : data,
    isLoading: !unauthenticated && isLoading,
    isError: !!error && !unauthenticated,
    unauthenticated,
  };
}
