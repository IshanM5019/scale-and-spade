import useSWR from 'swr';
import apiClient from '@/lib/apiClient';
import { useState } from 'react';
import type { 
  AnalyzeRequest, 
  AnalyzeResponse, 
  FinancialSnapshot, 
  ScrapeJobResult 
} from '@/types/analyze';

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

export function useAnalyze() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyzeResponse | null>(null);

  const triggerAnalysis = async (payload: AnalyzeRequest): Promise<AnalyzeResponse | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<AnalyzeResponse>('/api/v1/analyze', payload);
      setData(res.data);
      return res.data;
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'An error occurred during analysis');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { triggerAnalysis, data, isLoading, error, setData };
}

export function useFinancialSnapshot(period?: string) {
  const params = new URLSearchParams();
  if (period) params.append('period', period);
  const qs = params.toString() ? `?${params.toString()}` : '';

  const { data, error, isLoading } = useSWR<FinancialSnapshot>(
    `/api/v1/analyze/financial${qs}`,
    fetcher
  );

  return {
    snapshot: data,
    isLoading,
    isError: !!error,
  };
}

export function useScrapeJobStatus(jobId: string | null) {
  const { data, error } = useSWR<ScrapeJobResult>(
    jobId ? `/api/v1/analyze/jobs/${jobId}` : null,
    fetcher,
    {
      refreshInterval: (data) => {
        // Stop polling if the job is done or failed
        if (data?.status === 'done' || data?.status === 'failed') {
          return 0;
        }
        return 3000; // poll every 3 seconds
      },
    }
  );

  return {
    job: data,
    isLoading: !error && !data && !!jobId,
    isError: !!error,
  };
}
