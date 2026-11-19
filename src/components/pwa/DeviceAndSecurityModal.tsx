import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Fingerprint,
  Camera,
  Mic,
  MapPin,
  ShieldCheck,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Square,
  Play,
  RefreshCw,
  CloudUpload,
  Smartphone,
} from 'lucide-react';
import type { UserProfile } from '../../types';
import {
  checkPlatformBiometricSupport,
  detectBiometricLabel,
  enrollBiometricLock,
  fetchBiometricStatus,
  removeBiometricCredential,
  BiometricCredentialInfo,
} from '../../services/webauthn';
import {
  queryHardwarePermissions,
  requestCameraStream,
  captureVideoFrameAsFile,
  requestMicrophoneStream,
  stopMediaStream,
  getCurrentLocation,
  HardwarePermissionSummary,
  GeoCoordinatesSnapshot,
} from '../../services/deviceHardware';
import { getSyncStatus, flushOfflineQueue, subscribeToSyncStatus } from '../../services/offlineSync';

interface DeviceAndSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onBiometricStatusChanged?: (enabled: boolean, credentialId?: string) => void;
}

export const DeviceAndSecurityModal: React.FC<DeviceAndSecurityModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onBiometricStatusChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'security' | 'hardware'>('security');

  // Biometric state
  const [biometricSupported, setBiometricSupported] = useState<boolean>(false);
  const [credentials, setCredentials] = useState<BiometricCredentialInfo[]>([]);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioMessage, setBioMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync state
  const [syncStatus, setSyncStatus] = useState(() => getSyncStatus());

  // Hardware permissions & live tools state
  const [permissions, setPermissions] = useState<HardwarePermissionSummary>({
    camera: 'prompt',
    microphone: 'prompt',
    geolocation: 'prompt',
  });
  const [hwError, setHwError] = useState<string | null>(null);

  // Camera preview
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);

  // Microphone recorder (Hifz recitation check)
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);

  // Geolocation check-in
  const [locationLoading, setLocationLoading] = useState(false);
  const [geoSnapshot, setGeoSnapshot] = useState<GeoCoordinatesSnapshot | null>(null);

  const { label: biometricLabel, deviceName: detectedDeviceName } = detectBiometricLabel();

  useEffect(() => {
    const unsub = subscribeToSyncStatus(setSyncStatus);
    return unsub;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopMediaStream(cameraStream);
      stopMediaStream(micStream);
      setCameraStream(null);
      setMicStream(null);
      setIsRecording(false);
      return;
    }

    setBioMessage(null);
    setHwError(null);

    checkPlatformBiometricSupport().then(setBiometricSupported).catch(() => setBiometricSupported(false));
    fetchBiometricStatus(currentUser.id)
      .then((res) => setCredentials(res.credentials || []))
      .catch(() => {});
    queryHardwarePermissions().then(setPermissions).catch(() => {});
  }, [isOpen, currentUser.id]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      stopMediaStream(cameraStream);
      stopMediaStream(micStream);
    };
  }, [cameraStream, micStream]);

  if (!isOpen) return null;

  const handleEnrollBiometric = async () => {
    setBioMessage(null);
    setBioLoading(true);
    try {
      const res = await enrollBiometricLock(detectedDeviceName);
      const updated = await fetchBiometricStatus(currentUser.id);
      setCredentials(updated.credentials || []);
      onBiometricStatusChanged?.(true, res.credentialID);
      setBioMessage({
        type: 'success',
        text: `${biometricLabel} enabled on ${res.deviceName}. Future launches will unlock automatically.`,
      });
    } catch (err: any) {
      setBioMessage({
        type: 'error',
        text: err?.message || 'Failed to register biometric credential.',
      });
    } finally {
      setBioLoading(false);
    }
  };

  const handleRemoveCredential = async (credentialID: string) => {
    setBioMessage(null);
    setBioLoading(true);
    try {
      await removeBiometricCredential(credentialID);
      const updated = await fetchBiometricStatus(currentUser.id);
      setCredentials(updated.credentials || []);
      onBiometricStatusChanged?.((updated.credentials || []).length > 0);
      setBioMessage({
        type: 'success',
        text: 'Biometric device removed from your account.',
      });
    } catch (err: any) {
      setBioMessage({
        type: 'error',
        text: err?.message || 'Could not remove biometric device.',
      });
    } finally {
      setBioLoading(false);
    }
  };

  const handleStartCamera = async () => {
    setHwError(null);
    setCapturedPhotoUrl(null);
    try {
      const stream = await requestCameraStream('user');
      setCameraStream(stream);
      queryHardwarePermissions().then(setPermissions).catch(() => {});
    } catch (err: any) {
      setHwError(err?.message || 'Unable to start camera.');
    }
  };

  const handleCapturePhoto = async () => {
    if (!videoRef.current) return;
    try {
      const { dataUrl } = await captureVideoFrameAsFile(videoRef.current);
      setCapturedPhotoUrl(dataUrl);
      stopMediaStream(cameraStream);
      setCameraStream(null);
    } catch (err: any) {
      setHwError(err?.message || 'Failed to capture photo.');
    }
  };

  const handleToggleRecording = async () => {
    setHwError(null);
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      return;
    }

    try {
      setRecordedAudioUrl(null);
      const stream = await requestMicrophoneStream();
      setMicStream(stream);
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);
        stopMediaStream(stream);
        setMicStream(null);
      };

      recorder.start();
      setIsRecording(true);
      queryHardwarePermissions().then(setPermissions).catch(() => {});
    } catch (err: any) {
      setHwError(err?.message || 'Unable to access microphone.');
    }
  };

  const handleAcquireLocation = async () => {
    setHwError(null);
    setLocationLoading(true);
    try {
      const snap = await getCurrentLocation();
      setGeoSnapshot(snap);
      queryHardwarePermissions().then(setPermissions).catch(() => {});
    } catch (err: any) {
      setHwError(err?.message || 'Unable to get campus GPS location.');
    } finally {
      setLocationLoading(false);
    }
  };

  const permBadge = (state: string) => {
    if (state === 'granted') {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (state === 'denied') {
      return 'bg-rose-100 text-rose-800 border-rose-200';
    }
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">App Security & Device Hardware</h3>
              <p className="text-[11px] text-slate-500">Biometrics, Offline Sync & Native Sensors</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="px-5 pt-3 flex gap-2 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'security'
                ? 'border-emerald-700 text-emerald-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5" />
            <span>Biometrics & Sync</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hardware')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'hardware'
                ? 'border-emerald-700 text-emerald-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera, Mic & GPS</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {activeTab === 'security' ? (
            <>
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      <span>{biometricLabel}</span>
                    </div>
                    <p className="text-[11px] text-emerald-900/80 leading-relaxed">
                      Unlock Hyba instantly on app launch using your device&apos;s Fingerprint or Face Unlock without re-entering your password.
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border shrink-0 ${
                      credentials.length > 0
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {credentials.length > 0 ? 'Active' : 'Off'}
                  </span>
                </div>

                {bioMessage && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-start gap-2 ${
                      bioMessage.type === 'success'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {bioMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span>{bioMessage.text}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleEnrollBiometric}
                  disabled={bioLoading || !biometricSupported}
                  className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>
                    {!biometricSupported
                      ? 'Biometrics Unavailable on This Browser'
                      : bioLoading
                      ? 'Verifying Biometric Sensor...'
                      : credentials.length > 0
                      ? `Register Another Device (${detectedDeviceName})`
                      : `Enable ${biometricLabel}`}
                  </span>
                </button>
              </div>

              {credentials.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Registered Biometric Devices
                  </div>
                  {credentials.map((cred) => (
                    <div
                      key={cred.credentialID}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {cred.deviceName}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Added {new Date(cred.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCredential(cred.credentialID)}
                        disabled={bioLoading}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove device"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Offline Background Sync Queue Summary */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <CloudUpload className="w-4 h-4 text-emerald-700" />
                    <span>Offline Background Sync</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                    {syncStatus.pendingCount} Queued
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Attendance logs, Hifz records, and portal updates submitted offline are safely stored in IndexedDB and synced automatically when online.
                </p>
                {syncStatus.pendingCount > 0 && (
                  <button
                    type="button"
                    onClick={() => flushOfflineQueue()}
                    disabled={!syncStatus.isOnline || syncStatus.isSyncing}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
                    <span>{syncStatus.isSyncing ? 'Syncing...' : 'Sync Pending Actions Now'}</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {hwError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{hwError}</span>
                </div>
              )}

              {/* Camera Card */}
              <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-emerald-700" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Camera Access</div>
                      <div className="text-[10px] text-slate-500">Student photos, ID verification & event uploads</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${permBadge(permissions.camera)}`}>
                    {permissions.camera}
                  </span>
                </div>

                {cameraStream && (
                  <div className="space-y-2">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-44 object-cover rounded-xl bg-slate-900"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCapturePhoto}
                        className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Capture Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          stopMediaStream(cameraStream);
                          setCameraStream(null);
                        }}
                        className="px-3 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                      >
                        Stop
                      </button>
                    </div>
                  </div>
                )}

                {capturedPhotoUrl && !cameraStream && (
                  <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-200">
                    <img src={capturedPhotoUrl} alt="Captured preview" className="w-16 h-12 object-cover rounded-lg" />
                    <div className="text-[11px] text-emerald-800 font-semibold">Camera verified & frame captured</div>
                  </div>
                )}

                {!cameraStream && (
                  <button
                    type="button"
                    onClick={handleStartCamera}
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-900 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Open Camera Preview
                  </button>
                )}
              </div>

              {/* Microphone Card */}
              <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-emerald-700" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Microphone · Hifz Recitation Check</div>
                      <div className="text-[10px] text-slate-500">Voice recitation capture for Sabq & Tajweed review</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${permBadge(permissions.microphone)}`}>
                    {permissions.microphone}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleRecording}
                    className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      isRecording
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-slate-100 hover:bg-emerald-50 hover:text-emerald-900 text-slate-700'
                    }`}
                  >
                    {isRecording ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Stop Recording...</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5" />
                        <span>Record Voice Sample</span>
                      </>
                    )}
                  </button>
                </div>

                {recordedAudioUrl && (
                  <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center gap-2">
                    <Play className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <audio controls src={recordedAudioUrl} className="w-full h-8" />
                  </div>
                )}
              </div>

              {/* GPS / Location Card */}
              <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-700" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">GPS / Campus Geolocation</div>
                      <div className="text-[10px] text-slate-500">Verify on-campus presence for attendance check-ins</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${permBadge(permissions.geolocation)}`}>
                    {permissions.geolocation}
                  </span>
                </div>

                {geoSnapshot && (
                  <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-[11px] text-emerald-950 font-mono">
                    Lat: {geoSnapshot.latitude.toFixed(5)} · Lng: {geoSnapshot.longitude.toFixed(5)} (±{geoSnapshot.accuracy}m)
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAcquireLocation}
                  disabled={locationLoading}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-900 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-60"
                >
                  {locationLoading ? 'Acquiring GPS Coordinates...' : 'Verify Campus Location'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
