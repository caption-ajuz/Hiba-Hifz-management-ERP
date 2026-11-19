import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
} from '@simplewebauthn/browser';
import type { UserProfile } from '../types';
import { getAuthToken, setAuthToken } from './api';

export interface BiometricCredentialInfo {
  credentialID: string;
  deviceName: string;
  authenticatorType: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface BiometricStatusResult {
  hasBiometrics: boolean;
  credentialCount: number;
  credentials: BiometricCredentialInfo[];
}

export function detectBiometricLabel(): { label: string; deviceName: string } {
  if (typeof navigator === 'undefined') {
    return { label: 'Fingerprint / Face Unlock', deviceName: 'Hyba Device' };
  }
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return { label: 'Face ID / Touch ID', deviceName: /iPad/i.test(ua) ? 'iPad' : 'iPhone' };
  }
  if (/Android/i.test(ua)) {
    return { label: 'Fingerprint / Face Unlock', deviceName: 'Android Device' };
  }
  if (/Macintosh|Mac OS X/i.test(ua)) {
    return { label: 'Touch ID', deviceName: 'MacBook / Mac' };
  }
  if (/Windows/i.test(ua)) {
    return { label: 'Windows Hello (Face / Fingerprint)', deviceName: 'Windows PC' };
  }
  return { label: 'Fingerprint / Face Unlock', deviceName: 'Trusted Device' };
}

export async function checkPlatformBiometricSupport(): Promise<boolean> {
  try {
    if (!browserSupportsWebAuthn()) return false;
    return await platformAuthenticatorIsAvailable();
  } catch {
    return false;
  }
}

export async function fetchBiometricStatus(userId?: string): Promise<BiometricStatusResult> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';

  const res = await fetch(`/api/auth/webauthn/status${query}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });
  if (!res.ok) {
    return { hasBiometrics: false, credentialCount: 0, credentials: [] };
  }
  const json = await res.json();
  return json.data || { hasBiometrics: false, credentialCount: 0, credentials: [] };
}

export async function enrollBiometricLock(
  customDeviceName?: string
): Promise<{ credentialID: string; deviceName: string }> {
  const supported = await checkPlatformBiometricSupport();
  if (!supported) {
    throw new Error('This device or browser does not support built-in Fingerprint or Face Unlock.');
  }

  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const optRes = await fetch('/api/auth/webauthn/register/options', {
    method: 'POST',
    headers,
    credentials: 'include',
  });

  if (!optRes.ok) {
    const err = await optRes.json().catch(() => ({}));
    throw new Error(err.error || 'Could not start biometric setup.');
  }

  const { data: optionsJSON } = await optRes.json();

  let attestationResponse;
  try {
    attestationResponse = await startRegistration({ optionsJSON });
  } catch (err: any) {
    if (err?.name === 'NotAllowedError') {
      throw new Error('Biometric verification was cancelled or timed out.');
    }
    if (err?.name === 'InvalidStateError') {
      throw new Error('Biometric unlock is already registered on this device.');
    }
    throw new Error(err?.message || 'Biometric sensor prompt failed.');
  }

  const { deviceName: detectedName } = detectBiometricLabel();
  const finalDeviceName = customDeviceName?.trim() || detectedName;

  const verifyRes = await fetch('/api/auth/webauthn/register/verify', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      response: attestationResponse,
      deviceName: finalDeviceName,
    }),
  });

  if (!verifyRes.ok) {
    const err = await verifyRes.json().catch(() => ({}));
    throw new Error(err.error || 'Could not verify biometric passkey.');
  }

  const verifyJson = await verifyRes.json();
  return {
    credentialID: verifyJson.data.credentialID,
    deviceName: verifyJson.data.deviceName || finalDeviceName,
  };
}

export async function authenticateWithBiometrics(identifier: {
  userId?: string;
  username?: string;
}): Promise<{ token: string; user: UserProfile }> {
  if (!browserSupportsWebAuthn()) {
    throw new Error('WebAuthn biometrics are not supported in this browser.');
  }

  const optRes = await fetch('/api/auth/webauthn/authenticate/options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(identifier),
  });

  if (!optRes.ok) {
    const err = await optRes.json().catch(() => ({}));
    throw new Error(err.error || 'Biometric unlock is not configured for this account.');
  }

  const optJson = await optRes.json();
  const { userId, options: optionsJSON } = optJson.data;

  let assertionResponse;
  try {
    assertionResponse = await startAuthentication({ optionsJSON });
  } catch (err: any) {
    if (err?.name === 'NotAllowedError') {
      throw new Error('Biometric verification cancelled. Tap retry or use your password.');
    }
    throw new Error(err?.message || 'Device biometric prompt failed.');
  }

  const verifyRes = await fetch('/api/auth/webauthn/authenticate/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      userId,
      response: assertionResponse,
    }),
  });

  if (!verifyRes.ok) {
    const err = await verifyRes.json().catch(() => ({}));
    throw new Error(err.error || 'Biometric authentication verification failed.');
  }

  const data = await verifyRes.json();
  if (data.token) {
    setAuthToken(data.token);
  }
  return {
    token: data.token,
    user: data.user,
  };
}

export async function removeBiometricCredential(credentialId: string): Promise<void> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/api/auth/webauthn/credentials/${encodeURIComponent(credentialId)}`, {
    method: 'DELETE',
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to remove biometric device.');
  }
}
