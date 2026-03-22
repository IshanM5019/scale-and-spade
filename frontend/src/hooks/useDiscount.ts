import { useState } from 'react';
import apiClient from '@/lib/apiClient';
import type { DiscountViabilityRequest, DiscountViabilityResponse } from '@/types/discount';

export function useDiscount() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DiscountViabilityResponse | null>(null);

  const checkViability = async (payload: DiscountViabilityRequest): Promise<DiscountViabilityResponse | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<DiscountViabilityResponse>('/api/v1/discount/viability', payload);
      setData(res.data);
      return res.data;
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'An error occurred testing discount viability');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Provide a reset method to clear the current results if the user changes inputs
  const reset = () => {
    setData(null);
    setError(null);
  };

  return { checkViability, data, isLoading, error, reset };
}
