import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { UserRole } from '../types';
import {
  Database,
  Cloud,
  Zap,
  RefreshCw,
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  ShieldAlert,
} from 'lucide-react';

interface DatabaseStatusIndicatorProps {
  userRole: UserRole;
}

export const DatabaseStatusIndicator: React.FC<DatabaseStatusIndicatorProps> = ({ userRole }) => {
  const [status, setStatus] = useState<'green' | 'amber' | 'red' | 'grey'>('grey');
  const [isOpen, setIsOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Minimal non-polling health fetch on mount and on modal open
  useEffect(() => {
    let isMounted = true;
    api.getMinimalHealth()
      .then((res) => {
        if (isMounted && res) {
          setStatus(res.overall || 'green');
        }
      })
      .catch(() => {
        if (isMounted) setStatus('amber');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenDiagnostics = async () => {
    // Only Super Admin can view diagnostic popover
    if (userRole !== 'SUPER_ADMIN') return;

    setIsOpen(true);
    setIsLoading(true);
    try {
      const data = await api.getDiagnostics();
      setDiagnostics(data);
      if (data?.overall) setStatus(data.overall);
    } catch (err) {
      console.error('Failed to load diagnostics', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const updated = await api.retryConnection();
      setDiagnostics(updated);
      if (updated?.overall) setStatus(updated.overall);
    } catch (err) {
      console.error('Retry failed', err);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDownloadEnv = () => {
    window.location.href = '/api/download-env';
  };

  // Color classes for the minimal circle
  const getDotColorClass = () => {
    switch (status) {
      case 'green':
        return 'bg-emerald-500 ring-2 ring-emerald-200/50 shadow-xs shadow-emerald-500/50';
      case 'amber':
        return 'bg-amber-400 ring-2 ring-amber-200/50 animate-pulse';
      case 'red':
        return 'bg-rose-500 ring-2 ring-rose-200/50';
      default:
        return 'bg-slate-300 ring-1 ring-slate-200';
    }
  };

  const getStatusTooltip = () => {
    if (userRole !== 'SUPER_ADMIN') {
      return status === 'green' ? 'Systems Connected' : 'Connecting';
    }
    return `Infrastructure Status (${status === 'green' ? 'Operational' : status === 'amber' ? 'Degraded' : 'Offline'}) - Click for Diagnostics`;
  };

  return (
    <>
      {/* Minimal subtle circular indicator in Top Nav */}
      <button
        onClick={handleOpenDiagnostics}
        disabled={userRole !== 'SUPER_ADMIN'}
        title={getStatusTooltip()}
        className={`relative flex items-center justify-center p-1 rounded-full transition-transform focus:outline-hidden ${
          userRole === 'SUPER_ADMIN'
            ? 'cursor-pointer hover:scale-110'
            : 'cursor-default pointer-events-none'
        }`}
        aria-label="Database & Infrastructure Status"
      >
        <span className={`w-2.5 h-2.5 rounded-full ${getDotColorClass()} transition-colors duration-300`}></span>
      </button>

      {/* Super Admin Compact Diagnostics Popover */}
      {isOpen && userRole === 'SUPER_ADMIN' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-3 h-3 rounded-full ${
                    status === 'green'
                      ? 'bg-emerald-500'
                      : status === 'amber'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Infrastructure & Cloud Health
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Sanitized system diagnostics (Super Admin view)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Diagnostic Content */}
            <div className="p-5 space-y-4">
              {isLoading ? (
                <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin" />
                  <span>Checking database & cloud microservices...</span>
                </div>
              ) : diagnostics ? (
                <>
                  {/* Service 1: MongoDB Atlas */}
                  <div className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-emerald-700" />
                        <span className="text-xs font-bold text-slate-900">
                          {diagnostics.services?.mongodb?.name || 'MongoDB Atlas'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {diagnostics.services?.mongodb?.isOperational ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3" />
                            Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                            <XCircle className="w-3 h-3" />
                            {diagnostics.services?.mongodb?.status || 'Disconnected'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      {diagnostics.services?.mongodb?.troubleshooting}
                    </div>
                    {diagnostics.services?.mongodb?.lastConnectedAt && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        Last Active: {new Date(diagnostics.services.mongodb.lastConnectedAt).toLocaleTimeString()}
                      </div>
                    )}
                  </div>

                  {/* Service 2: Cloudinary */}
                  <div className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cloud className="w-4 h-4 text-sky-700" />
                        <span className="text-xs font-bold text-slate-900">
                          {diagnostics.services?.cloudinary?.name || 'Cloudinary Media'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {diagnostics.services?.cloudinary?.isOperational ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3" />
                            Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                            <AlertTriangle className="w-3 h-3" />
                            Unconfigured / Offline
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      {diagnostics.services?.cloudinary?.troubleshooting}
                    </div>
                  </div>

                  {/* Service 3: Socket.IO */}
                  <div className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-bold text-slate-900">
                          {diagnostics.services?.websocket?.name || 'WebSocket Engine'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {diagnostics.services?.websocket?.isOperational ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3" />
                            Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                            <XCircle className="w-3 h-3" />
                            Offline
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      {diagnostics.services?.websocket?.troubleshooting}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-500 text-center py-4">
                  Unable to retrieve backend diagnostics.
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 font-semibold text-slate-800 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                  <span>{isRetrying ? 'Retrying...' : 'Retry Health Check'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadEnv}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  title="Download configured .env file for deployment"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .env</span>
                </button>
              </div>

              {/* Security notice */}
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 justify-center">
                <ShieldAlert className="w-3 h-3" />
                <span>Sensitive credentials remain strictly secured on server.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
