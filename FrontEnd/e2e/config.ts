const apiBaseUrl = (process.env.E2E_API_URL ?? 'https://localhost:7035/api')
  .replace(/\/+$/, '');

export const API_ROUTE_PATTERN = `${apiBaseUrl}/**`;
