import React, { useState, useEffect } from 'react';
import { CollegeEvent, EventCategory, EventStatus, UserProfile } from '../types';
import { api } from '../services/api';
import { getGoogleCalendarUrl, downloadIcsFile } from '../utils/calendarUtils';
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  Download,
  ExternalLink,
  Users,
  Award,
  Sparkles,
  BookOpen,
  ChevronRight,
} from 'lucide-react';

interface EventsModuleProps {
  currentUser: UserProfile;
}

export const EventsModule: React.FC<EventsModuleProps> = ({ currentUser }) => {
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
  const isUsthad = currentUser.role === 'USTHAD';
  const canManageEvents = isSuperAdmin || isUsthad;

  const [events, setEvents] = useState<CollegeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modal states
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CollegeEvent | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
  const [isImportant, setIsImportant] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const data = await api.getEvents();
      setEvents(data);
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
    setIsImportant(Boolean(evt.isImportant));
    setFormError(null);
    setShowEventModal(true);
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
        isImportant,
      };

      if (editingEvent) {
        const updated = await api.updateEvent(editingEvent.id, payload);
        setEvents((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await api.createEvent(payload);
        setEvents((prev) => [created, ...prev]);
      }
      setShowEventModal(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await api.deleteEvent(id);
      setEvents((prev) => prev.filter((item) => item.id !== id));
      setDeleteConfirmId(null);
    } catch (err: any) {
      alert(`Failed to delete event: ${err.message}`);
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
          <div className="inline-flex items-center gap-1.5 bg-emerald-800/80 text-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-emerald-700">
            <Calendar className="w-3.5 h-3.5" />
            <span>Academic Programs & College Events</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-extrabold text-white mt-1">
            College Events, Majlis & Calendars
          </h1>
          <p className="text-xs text-emerald-200/90 mt-0.5">
            Markazul Hidayathil Islamiyya · Schedule ceremonies, competitions, tests, and add to your device calendar.
          </p>
        </div>

        {canManageEvents && (
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-4 h-4 text-emerald-700 stroke-[2.5]" />
            <span>Schedule College Event</span>
          </button>
        )}
      </div>

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

        {/* Category Pills */}
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
        {filteredEvents.length > 0 ? (
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
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs hover:border-emerald-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 flex-1">
                  {/* Calendar Date Block */}
                  <div className="w-16 h-18 rounded-2xl bg-gradient-to-b from-emerald-900 to-teal-950 text-white flex flex-col items-center justify-center shrink-0 shadow-xs border border-emerald-800">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300">
                      {monthStr}
                    </span>
                    <span className="text-xl font-extrabold font-mono leading-none my-0.5">
                      {dayStr}
                    </span>
                    <span className="text-[9px] text-emerald-200/80 font-mono">
                      {year}
                    </span>
                  </div>

                  {/* Main Event Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-900 border border-emerald-200/60 px-2 py-0.5 rounded">
                        {event.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          event.status === 'Completed'
                            ? 'bg-slate-100 text-slate-600'
                            : event.status === 'Ongoing'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-teal-50 text-teal-800 border border-teal-200'
                        }`}
                      >
                        {event.status}
                      </span>
                      {event.targetAudience !== 'ALL' && (
                        <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          Audience: {event.targetAudience}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {event.title}
                    </h3>
                    {event.arabicTitle && (
                      <div className="text-xs text-emerald-700 font-arabic">
                        {event.arabicTitle}
                      </div>
                    )}

                    <p className="text-xs text-slate-600 line-clamp-2">
                      {event.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 pt-1 font-medium">
                      <div className="flex items-center gap-1.5 text-slate-700 font-mono">
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
                        <div className="text-[11px] text-slate-400 italic">
                          By: {event.createdBy}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Add to Calendar for Students & Parents + Admin Edit/Delete */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {/* Google Calendar Link */}
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

                  {/* iCal .ics download */}
                  <button
                    onClick={() => downloadIcsFile(event)}
                    className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                    title="Download iCal (.ics) file for Apple Calendar, Outlook, and mobile"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>Download .ics</span>
                  </button>

                  {/* Admin / Usthad Edit & Delete */}
                  {canManageEvents && (
                    <div className="flex items-center gap-1 self-end sm:self-auto">
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 animate-fade-in">
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
                className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteEvent(deleteConfirmId)}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700"
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
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
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
                  disabled={isSubmitting}
                  className="px-5 py-2 font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
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
