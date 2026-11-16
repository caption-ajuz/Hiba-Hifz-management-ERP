import React, { useState, useEffect, useMemo } from 'react';
import { X, Clock, Plus, Edit2, Trash2, AlertCircle, MapPin, User, Layers, CheckCircle2 } from 'lucide-react';
import { TimetableSlot, UserProfile } from '../types';
import { api } from '../services/api';

interface TimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile;
  slots?: TimetableSlot[];
  onTimetableChanged?: (slots: TimetableSlot[]) => void;
}

const DEFAULT_DAYS = [
  { id: 'D1', short: 'Sat', label: 'Saturday', arabic: 'السبت' },
  { id: 'D2', short: 'Sun', label: 'Sunday', arabic: 'الأحد' },
  { id: 'D3', short: 'Mon', label: 'Monday', arabic: 'الإثنين' },
  { id: 'D4', short: 'Tue', label: 'Tuesday', arabic: 'الثلاثاء' },
  { id: 'D5', short: 'Wed', label: 'Wednesday', arabic: 'الأربعاء' },
];

export const TimetableModal: React.FC<TimetableModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  slots: propSlots,
  onTimetableChanged,
}) => {
  const canEdit = currentUser?.role === 'MUDEER' || currentUser?.role === 'USTHAD';

  const [activeDay, setActiveDay] = useState<string>('D1');
  const [batchFilter, setBatchFilter] = useState<string>('ALL');
  const [slots, setSlots] = useState<TimetableSlot[]>(propSlots || []);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Inline delete confirmation state (no window.confirm)
  const [deleteTarget, setDeleteTarget] = useState<TimetableSlot | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);

  // Form field states
  const [slotDay, setSlotDay] = useState('D1');
  const [slotNumber, setSlotNumber] = useState(1);
  const [time, setTime] = useState('07:00 - 08:30');
  const [title, setTitle] = useState('');
  const [batch, setBatch] = useState('Hifz Batch A (Hifz Ul Uloom)');
  const [classId, setClassId] = useState('batch-a');
  const [room, setRoom] = useState('Tahfeez Hall 101');
  const [mentor, setMentor] = useState('Usthad Mohammed Ajash');
  const [tag, setTag] = useState('Sabq Focus');
  const [colorTheme, setColorTheme] = useState('emerald');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (propSlots && propSlots.length > 0) {
      setSlots(propSlots);
    }
  }, [propSlots]);

  useEffect(() => {
    if (isOpen) {
      setActionError(null);
      setActionSuccess(null);
      loadSlots();
    }
  }, [isOpen]);

  const syncSlots = (next: TimetableSlot[]) => {
    setSlots(next);
    if (onTimetableChanged) {
      onTimetableChanged(next);
    }
  };

  const loadSlots = async () => {
    setIsLoading(true);
    try {
      const data = await api.getTimetable();
      syncSlots(data);
    } catch (err: any) {
      setActionError(err.message || 'Failed to load timetable.');
    } finally {
      setIsLoading(false);
    }
  };

  const uniqueBatches = useMemo(() => {
    const set = new Set<string>();
    slots.forEach((s) => {
      if (s.batch) set.add(s.batch);
    });
    return Array.from(set);
  }, [slots]);

  const daySlots = useMemo(() => {
    return slots
      .filter((s) => s.day === activeDay && (batchFilter === 'ALL' || s.batch === batchFilter))
      .sort((a, b) => Number(a.slotNumber || 0) - Number(b.slotNumber || 0));
  }, [slots, activeDay, batchFilter]);

  if (!isOpen) return null;

  const openAddSlot = () => {
    setEditingSlot(null);
    setSlotDay(activeDay);
    const currentDaySlots = slots.filter((s) => s.day === activeDay);
    const nextSlotNum =
      currentDaySlots.length > 0
        ? Math.max(...currentDaySlots.map((s) => Number(s.slotNumber) || 0)) + 1
        : 1;
    setSlotNumber(Math.min(12, nextSlotNum));
    setTime('07:00 - 08:30');
    setTitle('');
    setBatch('Hifz Batch A (Hifz Ul Uloom)');
    setClassId('batch-a');
    setRoom('Tahfeez Hall 101');
    setMentor(currentUser?.role === 'USTHAD' ? currentUser.fullName : 'Usthad Mohammed Ajash');
    setTag('Sabq Focus');
    setColorTheme('emerald');
    setFormError(null);
    setShowFormModal(true);
  };

  const openEditSlot = (slot: TimetableSlot) => {
    setEditingSlot(slot);
    setSlotDay(slot.day);
    setSlotNumber(Number(slot.slotNumber) || 1);
    setTime(slot.time);
    setTitle(slot.title);
    setBatch(slot.batch);
    setClassId(slot.classId || 'batch-a');
    setRoom(slot.room);
    setMentor(slot.mentor);
    setTag(slot.tag || 'Sabq Focus');
    setColorTheme(
      slot.color?.includes('teal')
        ? 'teal'
        : slot.color?.includes('sky')
        ? 'sky'
        : slot.color?.includes('amber')
        ? 'amber'
        : slot.color?.includes('purple')
        ? 'purple'
        : 'emerald'
    );
    setFormError(null);
    setShowFormModal(true);
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const themeMap: Record<string, string> = {
      emerald: 'bg-emerald-50 border-emerald-200 text-emerald-950',
      teal: 'bg-teal-50 border-teal-200 text-teal-950',
      sky: 'bg-sky-50 border-sky-200 text-sky-950',
      amber: 'bg-amber-50 border-amber-200 text-amber-950',
      purple: 'bg-purple-50 border-purple-200 text-purple-950',
    };

    const inferredClassId =
      batch.toLowerCase().includes('batch b')
        ? 'batch-b'
        : batch.toLowerCase().includes('batch c') || batch.toLowerCase().includes('sanad')
        ? 'batch-c'
        : classId || 'batch-a';

    try {
      const payload: Partial<TimetableSlot> = {
        day: slotDay,
        slotNumber: Number(slotNumber) || 1,
        time: time.trim(),
        title: title.trim(),
        batch: batch.trim(),
        classId: inferredClassId,
        room: room.trim(),
        mentor: mentor.trim(),
        tag: tag.trim(),
        color: themeMap[colorTheme] || themeMap.emerald,
        campusId: currentUser?.campusId || 'campus-main',
      };

      if (editingSlot) {
        const updated = await api.updateTimetableSlot(editingSlot.id, payload);
        const next = slots.map((s) => (s.id === updated.id ? updated : s));
        syncSlots(next);
        setActiveDay(updated.day || slotDay);
        setActionSuccess('Timetable period updated successfully.');
      } else {
        const created = await api.createTimetableSlot(payload);
        const next = [...slots, created];
        syncSlots(next);
        setActiveDay(created.day || slotDay);
        setActionSuccess('New academic period added to timetable.');
      }
      setShowFormModal(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save timetable period.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteSlot = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await api.deleteTimetableSlot(deleteTarget.id);
      const next = slots.filter((s) => s.id !== deleteTarget.id);
      syncSlots(next);
      setDeleteTarget(null);
      setActionSuccess('Timetable period removed.');
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete period.');
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const tagAccentBar = (slotTag?: string, color?: string) => {
    if (color?.includes('amber') || slotTag?.toLowerCase().includes('manzil')) return 'bg-amber-500';
    if (color?.includes('sky') || slotTag?.toLowerCase().includes('tajweed')) return 'bg-sky-600';
    if (color?.includes('purple') || slotTag?.toLowerCase().includes('exam')) return 'bg-purple-600';
    if (color?.includes('teal') || slotTag?.toLowerCase().includes('revision')) return 'bg-teal-600';
    return 'bg-emerald-600';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92dvh] flex flex-col">
        {/* Sharp Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Clock className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-white">
                Academic Timetable & Daily Schedule
              </h2>
              <p className="text-[11px] text-slate-400">
                Markazul Hidayathil Islamiyya · Structured Hifz & Academic Routine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={openAddSlot}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Period</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close Timetable"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Day Tabs & Batch Filter Toolbar */}
        <div className="px-5 sm:px-6 py-3 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-lg overflow-x-auto">
            {DEFAULT_DAYS.map((d) => {
              const count = slots.filter((s) => s.day === d.id).length;
              const isActive = activeDay === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setActiveDay(d.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{d.label}</span>
                  <span className="font-arabic text-[11px] opacity-80">{d.arabic}</span>
                  <span className="font-mono tabular-nums text-[10px] text-slate-400">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-hidden focus:border-emerald-600"
            >
              <option value="ALL">All Batches</option>
              {uniqueBatches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Feedback banners */}
        {(actionError || actionSuccess) && (
          <div className="px-5 sm:px-6 pt-3">
            {actionError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  {actionError}
                </span>
                <button onClick={() => setActionError(null)} className="cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {actionSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  {actionSuccess}
                </span>
                <button onClick={() => setActionSuccess(null)} className="cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Sharp Table/Schedule Container */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-white">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading academic timetable...</div>
          ) : daySlots.length > 0 ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">
              {daySlots.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                    {/* Period Index + Accent Indicator */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`w-1.5 h-10 rounded-full ${tagAccentBar(item.tag, item.color)}`}
                        aria-hidden="true"
                      />
                      <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-mono tabular-nums font-bold text-xs text-slate-800">
                        P{item.slotNumber}
                      </div>
                    </div>

                    {/* Time Column */}
                    <div className="sm:w-36 shrink-0">
                      <div className="font-mono tabular-nums text-xs font-bold text-slate-900">
                        {item.time}
                      </div>
                      <div className="text-[11px] font-medium text-emerald-700 mt-0.5">
                        {item.tag || 'Sabq Focus'}
                      </div>
                    </div>

                    {/* Subject & Metadata */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-slate-900 leading-snug truncate">
                        {item.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 mt-1">
                        <span className="font-medium text-slate-700">{item.batch}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {item.room}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                          <User className="w-3 h-3 text-emerald-700" />
                          {item.mentor}
                        </span>
                      </div>
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => openEditSlot(item)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 rounded-xl">
              <Clock className="w-9 h-9 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-700">
                No periods scheduled for {DEFAULT_DAYS.find((d) => d.id === activeDay)?.label || activeDay}
              </div>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {canEdit
                  ? 'Click "Add Period" above to schedule study sessions for this day.'
                  : 'No timetable entries found for this filter.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium">
            Daily minimum target: 1 Juz Manzil · 1/4 Juz Sabq
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {/* Inline Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="w-11 h-11 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-slate-900">Delete Timetable Period?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Remove <strong>{deleteTarget.title}</strong> ({deleteTarget.time}) from {deleteTarget.day}?
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteSlot}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Timetable Hour Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-950 text-white">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">
                  {editingSlot ? 'Edit Timetable Period' : 'Add Timetable Period'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="p-6 space-y-3.5 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Day Schedule *</label>
                  <select
                    value={slotDay}
                    onChange={(e) => setSlotDay(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-medium"
                  >
                    {DEFAULT_DAYS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.id} · {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Period # *</label>
                  <input
                    required
                    type="number"
                    min={1}
                    max={12}
                    value={slotNumber}
                    onChange={(e) => setSlotNumber(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Time Slot (e.g. 07:00 - 08:30) *
                </label>
                <input
                  required
                  type="text"
                  placeholder="07:00 - 08:30"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Session Subject / Activity *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Sabq (السبق) · New Lesson Memorization"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Class / Batch</label>
                  <input
                    type="text"
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Study Hall / Room</label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mentor Usthad</label>
                <input
                  type="text"
                  value={mentor}
                  onChange={(e) => setMentor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Focus Tag</label>
                  <select
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-medium"
                  >
                    <option value="Sabq Focus">Sabq Focus</option>
                    <option value="Revision">Murajath (Revision)</option>
                    <option value="Manzil">Manzil (Cumulative)</option>
                    <option value="Tajweed">Tajweed & Makharij</option>
                    <option value="Oral Exam">Oral Exam</option>
                    <option value="Weekly Review">Weekly Review</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category Accent</label>
                  <select
                    value={colorTheme}
                    onChange={(e) => setColorTheme(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-medium"
                  >
                    <option value="emerald">Emerald (Sabq)</option>
                    <option value="teal">Teal (Revision)</option>
                    <option value="sky">Sky Blue (Tajweed)</option>
                    <option value="amber">Amber (Manzil)</option>
                    <option value="purple">Purple (Oral Exam)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : editingSlot ? 'Update Period' : 'Add Period'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
