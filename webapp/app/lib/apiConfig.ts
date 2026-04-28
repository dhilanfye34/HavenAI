const LOCAL_API_URL = 'http://localhost:8000';
export const PACKAGED_DESKTOP_API_URL = 'https://havenai-j4xu.onrender.com';

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

export function getApiUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    return stripTrailingSlashes(configuredUrl);
  }

  const isPackagedDesktop =
    typeof window !== 'undefined' && Boolean((window as any).havenai?.isPackaged);

  return isPackagedDesktop ? PACKAGED_DESKTOP_API_URL : LOCAL_API_URL;
}

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiUrl()}${normalizedPath}`;
}
