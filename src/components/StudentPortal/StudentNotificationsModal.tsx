import React, { useState, useMemo, useEffect } from 'react';
import { X, Bell, Megaphone, CheckCheck, Calendar, MapPin } from 'lucide-react';
import { STUDENT_NOTIFICATIONS } from '../../data/studentPortalData';
import { Announcement, CollegeEvent } from '../../types';

interface StudentNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  events?: CollegeEvent[];
  announcements?: Announcement[];
  onViewEvents?: () => void;
}

interface UnifiedNotificationItem {
  id: string;
  title: string;
  arabicTitle?: string;
  content: string;
  date: string;
  category: string;
  isUrgent: boolean;
  isEvent?: boolean;
  venue?: string;
  posterUrl?: string;
  read: boolean;
}

export const StudentNotificationsModal: React.FC<StudentNotificationsModalProps> = ({
  isOpen,
  onClose,
  events = [],
  announcements = [],
  onViewEvents,
}) => {
  const [readIds, setReadIds] = useState<Record<string, boolean>>({});
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD' | 'EVENTS'>('ALL');

  const combinedNotifications = useMemo<UnifiedNotificationItem[]>(() => {
    const eventItems: UnifiedNotificationItem[] = events
      .filter((ev) => ev.targetAudience === 'ALL' || ev.targetAudience === 'STUDENTS' || !ev.targetAudience)
      .map((ev) => ({
        id: `ev_${ev.id}`,
        title: ev.title,
        arabicTitle: ev.arabicTitle,
        content: ev.description,
        date: `${ev.startDate}${ev.startTime ? ` · ${ev.startTime}` : ''}`,
        category: `Event · ${ev.category}`,
        isUrgent: Boolean(ev.isImportant),
        isEvent: true,
        venue: ev.venue,
        posterUrl: ev.posterUrl,
        read: Boolean(readIds[`ev_${ev.id}`]),
      }));

    const annItems: UnifiedNotificationItem[] = announcements.map((ann) => ({
      id: `ann_${ann.id}`,
      title: ann.title,
      content: ann.content,
      date: ann.date,
      category: ann.category,
      isUrgent: Boolean(ann.isImportant),
      read: Boolean(readIds[`ann_${ann.id}`]),
    }));

    const fallbackStatic: UnifiedNotificationItem[] =
      eventItems.length === 0 && annItems.length === 0
        ? STUDENT_NOTIFICATIONS.map((n) => ({
            ...n,
            read: readIds[n.id] ?? n.read,
          }))
        : [];

    return [...eventItems, ...annItems, ...fallbackStatic];
  }, [events, announcements, readIds]);

  useEffect(() => {
    // Keep readIds clean
  }, [combinedNotifications.length]);

  if (!isOpen) return null;

  const markAllAsRead = () => {
    const next: Record<string, boolean> = { ...readIds };
    combinedNotifications.forEach((n) => {
      next[n.id] = true;
    });
    setReadIds(next);
  };

  const toggleRead = (id: string) => {
    setReadIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = combinedNotifications.filter((n) => {
    if (activeFilter === 'UNREAD') return !n.read;
    if (activeFilter === 'EVENTS') return Boolean(n.isEvent);
    return true;
  });

  const unreadCount = combinedNotifications.filter((n) => !n.read).length;
  const eventCount = combinedNotifications.filter((n) => n.isEvent).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in flex flex-col max-h-[85vh]">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center relative">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Notifications & Events</div>
              <div className="text-[11px] text-slate-500">
                {unreadCount > 0 ? `${unreadCount} unread updates` : 'All caught up!'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-white text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1 rounded-xl font-semibold transition-all cursor-pointer ${
                activeFilter === 'ALL'
                  ? 'bg-emerald-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({combinedNotifications.length})
            </button>
            <button
              onClick={() => setActiveFilter('EVENTS')}
              className={`px-3 py-1 rounded-xl font-semibold transition-all cursor-pointer ${
                activeFilter === 'EVENTS'
                  ? 'bg-emerald-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Events ({eventCount})
            </button>
            <button
              onClick={() => setActiveFilter('UNREAD')}
              className={`px-3 py-1 rounded-xl font-semibold transition-all cursor-pointer ${
                activeFilter === 'UNREAD'
                  ? 'bg-emerald-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark read</span>
            </button>
          )}
        </div>

        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-1">
              <Megaphone className="w-8 h-8 mx-auto text-slate-300" />
              <div className="text-xs font-semibold">No notifications in this filter</div>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleRead(item.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  !item.read
                    ? 'border-emerald-200 bg-emerald-50/40 shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {item.isEvent ? (
                      <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    ) : (
                      item.isUrgent && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    )}
                    <span className="text-xs font-bold text-slate-900 leading-tight truncate">
                      {item.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {item.date}
                  </span>
                </div>

                {item.arabicTitle && (
                  <div dir="rtl" className="text-xs font-arabic text-emerald-800">
                    {item.arabicTitle}
                  </div>
                )}

                {item.posterUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-h-36">
                    <img
                      src={item.posterUrl}
                      alt={item.title}
                      className="w-full h-32 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                <p className="text-xs text-slate-600 leading-relaxed">{item.content}</p>

                {item.venue && (
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-700 shrink-0" />
                    <span>{item.venue}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                  <span className="font-semibold text-emerald-800">{item.category}</span>
                  <span>{item.read ? 'Read' : 'Tap to mark read'}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          {onViewEvents ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onViewEvents();
              }}
              className="px-4 py-2 text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
            >
              Open Full Events Portal →
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
