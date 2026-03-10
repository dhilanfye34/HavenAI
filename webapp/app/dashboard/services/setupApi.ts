import {
  ProtectionStatus,
  SetupPreferences,
  SetupPreferencesUpdate,
} from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
    throw new Error('Failed to fetch device protection status.');
  }
  return response.json();
}

export async function getSetupPreferences(token: string): Promise<SetupPreferences> {
  const response = await fetch(`${API_URL}/setup/preferences`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch setup preferences.');
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
    const detail = await response.text();
    throw new Error(detail || 'Failed to save setup preferences.');
  }
  return response.json();
}
