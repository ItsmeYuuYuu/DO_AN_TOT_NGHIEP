import axios from 'axios';

interface ApiErrorPayload {
  message?: string;
  Message?: string;
}

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) return fallback;
  return error.response?.data?.message ?? error.response?.data?.Message ?? fallback;
};
