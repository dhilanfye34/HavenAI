import {
  ProtectionStatus,
  SetupPreferences,
  SetupPreferencesUpdate,
} from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

export async function getProtectionStatus(token: string): Promise<ProtectionStatus> {
  const response = await fetch(`${API_URL}/devices/status`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to fetch device protection status.'));
  }
  return response.json();
}

export async function getSetupPreferences(token: string): Promise<SetupPreferences> {
  const response = await fetch(`${API_URL}/setup/preferences`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to fetch setup preferences.'));
  }
  return response.json();
}

export async function updateSetupPreferences(
  token: string,
  payload: SetupPreferencesUpdate,
): Promise<SetupPreferences> {
  const response = await fetch(`${API_URL}/setup/preferences`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to save setup preferences.'));
  }
  return response.json();
}
