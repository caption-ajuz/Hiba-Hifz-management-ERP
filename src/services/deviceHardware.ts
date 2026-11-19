export type HardwarePermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface HardwarePermissionSummary {
  camera: HardwarePermissionState;
  microphone: HardwarePermissionState;
  geolocation: HardwarePermissionState;
}

export interface GeoCoordinatesSnapshot {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

async function querySinglePermission(name: 'camera' | 'microphone' | 'geolocation'): Promise<HardwarePermissionState> {
  if (typeof navigator === 'undefined') return 'unsupported';
  if (name === 'geolocation' && !('geolocation' in navigator)) return 'unsupported';
  if ((name === 'camera' || name === 'microphone') && !navigator.mediaDevices?.getUserMedia) {
    return 'unsupported';
  }
  if (!navigator.permissions?.query) return 'prompt';

  try {
    const status = await navigator.permissions.query({ name: name as PermissionName });
    if (status.state === 'granted' || status.state === 'denied' || status.state === 'prompt') {
      return status.state;
    }
    return 'prompt';
  } catch {
    // Safari / Firefox do not support querying 'camera'/'microphone' via Permissions API
    return 'prompt';
  }
}

export async function queryHardwarePermissions(): Promise<HardwarePermissionSummary> {
  const [camera, microphone, geolocation] = await Promise.all([
    querySinglePermission('camera'),
    querySinglePermission('microphone'),
    querySinglePermission('geolocation'),
  ]);
  return { camera, microphone, geolocation };
}

export async function requestCameraStream(facingMode: 'user' | 'environment' = 'environment'): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera access is not supported on this device or browser.');
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
  } catch (err: any) {
    if (err?.name === 'NotAllowedError') {
      throw new Error('Camera permission was denied. Enable camera access in your browser settings.');
    }
    if (err?.name === 'NotFoundError') {
      throw new Error('No camera sensor was detected on this device.');
    }
    throw new Error(err?.message || 'Unable to initialize device camera.');
  }
}

export function captureVideoFrameAsFile(
  videoEl: HTMLVideoElement,
  filename = `hyba-capture-${Date.now()}.jpg`
): Promise<{ file: File; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const width = videoEl.videoWidth || 640;
    const height = videoEl.videoHeight || 480;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not prepare image capture canvas.'));
      return;
    }
    ctx.drawImage(videoEl, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to encode captured frame.'));
          return;
        }
        const file = new File([blob], filename, { type: 'image/jpeg' });
        resolve({ file, dataUrl });
      },
      'image/jpeg',
      0.9
    );
  });
}

export async function requestMicrophoneStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone access is not supported on this device or browser.');
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
  } catch (err: any) {
    if (err?.name === 'NotAllowedError') {
      throw new Error('Microphone permission was denied. Enable microphone access in browser settings.');
    }
    if (err?.name === 'NotFoundError') {
      throw new Error('No microphone detected on this device.');
    }
    throw new Error(err?.message || 'Unable to initialize device microphone.');
  }
}

export function stopMediaStream(stream: MediaStream | null | undefined) {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

export function getCurrentLocation(timeoutMs = 12000): Promise<GeoCoordinatesSnapshot> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('GPS / Geolocation is not supported on this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          timestamp: pos.timestamp || Date.now(),
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('Location permission denied. Enable GPS access for campus check-in.'));
        } else if (err.code === err.TIMEOUT) {
          reject(new Error('GPS fix timed out. Please retry in an open area.'));
        } else {
          reject(new Error('Unable to acquire current location.'));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 30000,
      }
    );
  });
}
