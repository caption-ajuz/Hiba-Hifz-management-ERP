import React from 'react';

export const AppBootSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header Skeleton */}
      <div className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-900/15 animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-4 w-24 rounded-md bg-slate-200 animate-pulse" />
            <div className="h-2.5 w-36 rounded-md bg-slate-100 animate-pulse" />
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-20 rounded-lg bg-slate-100 animate-pulse" />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
          <div className="hidden md:block h-4 w-20 rounded bg-slate-200 animate-pulse" />
        </div>
      </div>

      {/* Main Content Skeleton */}
      <DashboardSkeleton />
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Hero Banner Skeleton */}
      <div className="rounded-2xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2.5">
            <div className="h-3 w-28 rounded bg-emerald-100 animate-pulse" />
            <div className="h-6 w-56 sm:w-72 rounded-lg bg-slate-200 animate-pulse" />
            <div className="h-3.5 w-44 rounded bg-slate-100 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-28 rounded-xl bg-emerald-100/80 animate-pulse" />
            <div className="h-9 w-28 rounded-xl bg-slate-100 animate-pulse" />
          </div>
        </div>
      </div>

      {/* KPI Metric Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((card) => (
          <div
            key={card}
            className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
              <div className="w-8 h-8 rounded-xl bg-slate-100 animate-pulse" />
            </div>
            <div className="h-7 w-16 rounded-md bg-slate-200 animate-pulse" />
            <div className="h-2.5 w-28 rounded bg-slate-100 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Two-Column Activity & Records Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200/80 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-4 w-40 rounded bg-slate-200 animate-pulse" />
            <div className="h-7 w-24 rounded-lg bg-slate-100 animate-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((row) => (
              <div
                key={row}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-200 animate-pulse shrink-0" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-32 sm:w-44 rounded bg-slate-200 animate-pulse" />
                    <div className="h-2.5 w-24 rounded bg-slate-100 animate-pulse" />
                  </div>
                </div>
                <div className="h-6 w-16 rounded-md bg-emerald-50 animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200/80 p-5 space-y-4">
          <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="p-3 rounded-xl bg-slate-50/80 space-y-2">
                <div className="h-3 w-3/4 rounded bg-slate-200 animate-pulse" />
                <div className="h-2.5 w-full rounded bg-slate-100 animate-pulse" />
                <div className="h-2.5 w-1/2 rounded bg-slate-100 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
