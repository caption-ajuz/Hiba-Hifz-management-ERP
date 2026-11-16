import React, { useState, useEffect } from 'react';
import { CollegeEvent, EventCategory, EventStatus, UserProfile } from '../types';
import { api } from '../services/api';
import { getGoogleCalendarUrl } from '../utils/calendarUtils';
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Search,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  UploadCloud,
  Loader2,
  Eye,
} from 'lucide-react';

interface EventsModuleProps {
  currentUser: UserProfile;
  events?: CollegeEvent[];
  onEventsChanged?: (events: CollegeEvent[]) => void;
}

export const EventsModule: React.FC<EventsModuleProps> = ({
  currentUser,
  events: propEvents,
  onEventsChanged,
}) => {
  const isMudeer = currentUser.role === 'MUDEER';
  const isUsthad = currentUser.role === 'USTHAD';
  const canManageEvents = isMudeer || isUsthad;

  const [events, setEvents] = useState<CollegeEvent[]>(propEvents || []);
  const [isLoading, setIsLoading] = useState(!propEvents);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal states
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CollegeEvent | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewPoster, setPreviewPoster] = useState<{ url: string; title: string } | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [arabicTitle, setArabicTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<EventCategory>('Academic');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('12:30 PM');
  const [venue, setVenue] = useState('Markazul Hidayathil Islamiyya Main Campus');
  const [targetAudience, setTargetAudience] = useState<'ALL' | 'STUDENTS' | 'PARENTS' | 'TEACHERS'>('ALL');
  const [status, setStatus] = useState<EventStatus>('Scheduled');
  const [posterUrl, setPosterUrl] = useState('');
  const [posterPublicId, setPosterPublicId] = useState<string | undefined>(undefined);
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [isImportant, setIsImportant] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (propEvents) {
      setEvents(propEvents);
      setIsLoading(false);
    }
  }, [propEvents]);

  useEffect(() => {
    loadEvents();
  }, []);

  const syncEvents = (next: CollegeEvent[]) => {
    setEvents(next);
    if (onEventsChanged) {
      onEventsChanged(next);
    }
  };

  const loadEvents = async () => {
    if (!propEvents) setIsLoading(true);
    try {
      const data = await api.getEvents();
      syncEvents(data);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingEvent(null);
    setTitle('');
    setArabicTitle('');
    setDescription('');
    setCategory('Academic');
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
    setStartTime('09:00 AM');
    setEndTime('12:30 PM');
    setVenue('Markazul Hidayathil Islamiyya Main Campus');
    setTargetAudience('ALL');
    setStatus('Scheduled');
    setPosterUrl('');
    setPosterPublicId(undefined);
    setIsImportant(false);
    setFormError(null);
    setShowEventModal(true);
  };

  const openEditModal = (evt: CollegeEvent) => {
    setEditingEvent(evt);
    setTitle(evt.title);
    setArabicTitle(evt.arabicTitle || '');
    setDescription(evt.description || '');
    setCategory(evt.category);
    setStartDate(evt.startDate);
    setEndDate(evt.endDate || evt.startDate);
    setStartTime(evt.startTime || '09:00 AM');
    setEndTime(evt.endTime || '12:30 PM');
    setVenue(evt.venue || 'Markazul Hidayathil Islamiyya Main Campus');
    setTargetAudience(evt.targetAudience);
    setStatus(evt.status);
    setPosterUrl(evt.posterUrl || '');
    setPosterPublicId(evt.posterPublicId);
    setIsImportant(Boolean(evt.isImportant));
    setFormError(null);
    setShowEventModal(true);
  };

  const handlePosterFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Event poster image must be smaller than 5MB.');
      return;
    }

    setFormError(null);
    setIsUploadingPoster(true);
    try {
      const uploaded = await api.uploadMedia(file, 'events', posterPublicId);
      setPosterUrl(uploaded.secure_url);
      setPosterPublicId(uploaded.public_id);
    } catch (err: any) {
      setFormError(err.message || 'Failed to upload event poster.');
    } finally {
      setIsUploadingPoster(false);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload: Partial<CollegeEvent> = {
        title,
        arabicTitle,
        description,
        category,
        startDate,
        endDate,
        startTime,
        endTime,
        venue,
        targetAudience,
        status,
        posterUrl,
        posterPublicId,
        isImportant,
        campusId: currentUser.campusId || 'campus-main',
      };

      if (editingEvent) {
        const updated = await api.updateEvent(editingEvent.id, payload);
        syncEvents(events.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await api.createEvent(payload);
        syncEvents([created, ...events]);
      }
      setShowEventModal(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    setActionError(null);
    try {
      await api.deleteEvent(id);
      syncEvents(events.filter((item) => item.id !== id));
      setDeleteConfirmId(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete event.');
      setDeleteConfirmId(null);
    }
  };

  const filteredEvents = events.filter((evt) => {
    if (selectedCategory !== 'ALL' && evt.category !== selectedCategory) return false;
    if (selectedStatus !== 'ALL' && evt.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        evt.title.toLowerCase().includes(q) ||
        (evt.arabicTitle && evt.arabicTitle.toLowerCase().includes(q)) ||
        (evt.description && evt.description.toLowerCase().includes(q)) ||
        (evt.venue && evt.venue.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const categories: EventCategory[] = [
    'Academic',
    'Ceremony',
    'Competition',
    'Exam',
    'Parent-Teacher Meeting',
    'Majlis',
    'Holiday',
    'General',
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-20">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-emerald-900 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300">
            <Calendar className="w-3.5 h-3.5" />
            <span>Academic Programs & College Events</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-extrabold text-white mt-1">
            College Events, Majlis & Calendars
          </h1>
          <p className="text-xs text-emerald-200/90 mt-0.5">
            Markazul Hidayathil Islamiyya · Schedule ceremonies, competitions, exams, and upload official event posters.
          </p>
        </div>

        {canManageEvents && (
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer self-start md:self-auto whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-emerald-700 stroke-[2.5]" />
            <span>Schedule College Event</span>
          </button>
        )}
      </div>

      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-rose-700 hover:text-rose-900 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search events, ceremonies, venues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto text-xs">
            <span className="text-slate-400">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
              <option value="Postponed">Postponed</option>
            </select>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              selectedCategory === 'ALL'
                ? 'bg-emerald-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Categories ({events.length})
          </button>
          {categories.map((cat) => {
            const count = events.filter((e) => e.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-emerald-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat} {count > 0 ? `(${count})` : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
            <span>Loading college events...</span>
          </div>
        ) : filteredEvents.length > 0 ? (
          filteredEvents.map((event) => {
            const dateParts = event.startDate.split('-');
            const year = dateParts[0];
            const monthNames = [
              'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
            ];
            const monthStr = monthNames[parseInt(dateParts[1], 10) - 1] || 'Nov';
            const dayStr = dateParts[2];

            const googleCalUrl = getGoogleCalendarUrl(event);

            return (
              <div
                key={event.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs hover:border-emerald-300 transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Optional Event Poster Thumbnail or Date Block */}
                  {event.posterUrl ? (
                    <button
                      type="button"
                      onClick={() => setPreviewPoster({ url: event.posterUrl!, title: event.title })}
                      className="w-20 h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 relative group cursor-pointer"
                      title="View Event Poster"
                    >
                      <img
                        src={event.posterUrl}
                        alt={`${event.title} poster`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="w-4 h-4 text-white" />
                      </div>
                    </button>
                  ) : (
                    <div className="w-16 h-18 rounded-2xl bg-gradient-to-b from-emerald-900 to-teal-950 text-white flex flex-col items-center justify-center shrink-0 shadow-xs border border-emerald-800">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300">
                        {monthStr}
                      </span>
                      <span className="text-xl font-extrabold font-mono leading-none my-0.5 tabular-nums">
                        {dayStr}
                      </span>
                      <span className="text-[9px] text-emerald-200/80 font-mono tabular-nums">
                        {year}
                      </span>
                    </div>
                  )}

                  {/* Main Event Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                      <span className="text-emerald-800">{event.category}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          event.status === 'Completed'
                            ? 'text-slate-500'
                            : event.status === 'Ongoing'
                            ? 'text-amber-700'
                            : 'text-teal-700'
                        }
                      >
                        {event.status}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {monthStr} {dayStr}, {year}
                      </span>
                      {event.targetAudience !== 'ALL' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Audience: {event.targetAudience}</span>
                        </>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {event.title}
                    </h3>
                    {event.arabicTitle && (
                      <div className="text-sm text-emerald-700 font-arabic">
                        {event.arabicTitle}
                      </div>
                    )}

                    <p className="text-xs text-slate-600 line-clamp-2">
                      {event.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 pt-1 font-medium">
                      <div className="flex items-center gap-1.5 text-slate-700 font-mono tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-emerald-700" />
                        <span>
                          {event.startTime} - {event.endTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate max-w-xs">{event.venue}</span>
                      </div>
                      {event.createdBy && (
                        <div className="text-[11px] text-slate-400">
                          By {event.createdBy}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Google Calendar + Poster View + Admin Edit/Delete */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  {event.posterUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewPoster({ url: event.posterUrl!, title: event.title })}
                      className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
                      <span>View Poster</span>
                    </button>
                  )}

                  <a
                    href={googleCalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-900 font-bold text-xs rounded-xl border border-emerald-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
                    title="Add directly to Google Calendar"
                  >
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Add to Google Calendar</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>

                  {canManageEvents && (
                    <div className="flex items-center gap-1 ml-auto lg:ml-0">
                      <button
                        onClick={() => openEditModal(event)}
                        className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Event"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(event.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">No College Events Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No academic programs or events match the chosen category or search criteria.
            </p>
          </div>
        )}
      </div>

      {/* Event Poster Preview Modal */}
      {previewPoster && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs"
          onClick={() => setPreviewPoster(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden max-w-xl w-full shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="text-xs font-bold text-slate-900 truncate pr-3">{previewPoster.title}</div>
              <button
                type="button"
                onClick={() => setPreviewPoster(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-slate-900 flex items-center justify-center max-h-[75vh] overflow-auto">
              <img
                src={previewPoster.url}
                alt={previewPoster.title}
                className="max-w-full max-h-[68vh] object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Delete College Event?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove this college event from the institutional calendar?
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteEvent(deleteConfirmId)}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 cursor-pointer"
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-950 text-white">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm sm:text-base font-bold">
                  {editingEvent ? 'Edit College Event' : 'Schedule New College Event'}
                </h3>
              </div>
              <button
                onClick={() => setShowEventModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-6 space-y-3.5 text-xs overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Event Poster Upload */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <div className="w-16 h-20 rounded-lg border border-slate-200 bg-white overflow-hidden flex items-center justify-center shrink-0">
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt="Event poster preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900">Event Poster (Optional)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Upload a JPG, PNG, or WEBP poster displayed in Student Portal & Event cards.
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 hover:border-emerald-600 text-slate-700 hover:text-emerald-800 rounded-lg font-semibold cursor-pointer shadow-2xs">
                      {isUploadingPoster ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UploadCloud className="w-3.5 h-3.5" />
                      )}
                      <span>{isUploadingPoster ? 'Uploading...' : posterUrl ? 'Change Poster' : 'Upload Poster'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePosterFileChange}
                        className="hidden"
                        disabled={isUploadingPoster}
                      />
                    </label>
                    {posterUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setPosterUrl('');
                          setPosterPublicId(undefined);
                        }}
                        className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Event Title *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Annual Hifz Convocation & Sanad Ceremony"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Arabic Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. حفل تخريج حفظة كتاب الله"
                  value={arabicTitle}
                  onChange={(e) => setArabicTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-arabic"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as EventCategory)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Event Status *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as EventStatus)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-medium"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Postponed">Postponed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    required
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 09:00 AM"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 01:00 PM"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Location / Venue *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Markaz Central Grand Convention Hall"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Target Audience
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-medium"
                  >
                    <option value="ALL">All (General Campus)</option>
                    <option value="STUDENTS">Students Only</option>
                    <option value="PARENTS">Parents & Guardians</option>
                    <option value="TEACHERS">Faculty & Staff</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isImportant}
                    onChange={(e) => setIsImportant(e.target.checked)}
                    className="rounded text-emerald-700"
                  />
                  <span className="font-semibold text-slate-700">Pin as Important Notice</span>
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Description / Event Details
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide program agenda, guest scholars, or preparation instructions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingPoster}
                  className="px-5 py-2 font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isSubmitting ? 'Saving...' : editingEvent ? 'Save Changes' : 'Schedule Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
