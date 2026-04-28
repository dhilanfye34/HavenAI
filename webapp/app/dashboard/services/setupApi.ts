import {
  ProtectionStatus,
  SetupPreferences,
  SetupPreferencesUpdate,
} from '../types';
import { apiUrl } from '../../lib/apiConfig';

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.detail === 'string') {
      return data.detail;
    }
    if (Array.isArray(data?.detail)) {
      return data.detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(', ');
    }
  } catch {
    // Ignore JSON parsing errors and use text fallback.
  }
  try {
    const text = await response.text();
    return text || fallback;
  } catch {
    return fallback;
  }
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// ── Token refresh logic ──

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;

  try {
    const response = await fetch(apiUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    localStorage.setItem('access_token', data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token);
    }
    return data.access_token;
  } catch {
    return null;
  }
}

// Deduplicate concurrent refresh attempts
function getRefreshedToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// Wrapper: make a fetch, if 401 try refreshing the token and retry once
async function fetchWithAuth(
  url: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: { ...authHeaders(token), ...(init?.headers || {}) },
  });

  if (response.status === 401) {
    const newToken = await getRefreshedToken();
    if (newToken) {
      // Retry with new token
      return fetch(url, {
        ...init,
        headers: { ...authHeaders(newToken), ...(init?.headers || {}) },
      });
    }
    // Refresh failed — redirect to login
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

  return response;
}

// ── API functions ──

export interface DeviceInfo {
  id: string;
  name: string;
  os_type: string;
  os_version: string | null;
  is_active: boolean;
  is_online: boolean;
  last_seen: string;
  created_at: string;
}

export async function listDevices(token: string): Promise<DeviceInfo[]> {
  const response = await fetchWithAuth(apiUrl('/devices'), token);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to fetch devices.'));
  }
  return response.json();
}

export async function unlinkDevice(token: string, deviceId: string): Promise<void> {
  const response = await fetchWithAuth(apiUrl(`/devices/${deviceId}/unlink`), token, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to unlink device.'));
  }
}

export async function getProtectionStatus(token: string): Promise<ProtectionStatus> {
  const response = await fetchWithAuth(apiUrl('/devices/status'), token);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to fetch device protection status.'));
  }
  return response.json();
}

export async function getSetupPreferences(token: string): Promise<SetupPreferences> {
  const response = await fetchWithAuth(apiUrl('/setup/preferences'), token);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to fetch setup preferences.'));
  }
  return response.json();
}

export async function updateSetupPreferences(
  token: string,
  payload: SetupPreferencesUpdate,
): Promise<SetupPreferences> {
  const response = await fetchWithAuth(apiUrl('/setup/preferences'), token, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to save setup preferences.'));
  }
  return response.json();
}
