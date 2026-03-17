import axios from "axios";
import { getSupabaseClient } from "./supabaseClient";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach the Supabase JWT to every request automatically
apiClient.interceptors.request.use(async (config) => {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }

  return config;
});

// Global error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired — could redirect to login here
      console.warn("Unauthorized — redirecting to login");
    }
    return Promise.reject(error);
  }
);

export default apiClient;
