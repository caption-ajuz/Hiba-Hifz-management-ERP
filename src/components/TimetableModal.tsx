import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, BookOpen, Layers, Plus, Edit2, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { TimetableSlot, UserProfile } from '../types';
import { api } from '../services/api';

interface TimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile;
}

const DEFAULT_DAYS = [
  { id: 'D1', label: 'Saturday (السبت)' },
  { id: 'D2', label: 'Sunday (الأحد)' },
  { id: 'D3', label: 'Monday (الإثنين)' },
  { id: 'D4', label: 'Tuesday (الثلاثاء)' },
  { id: 'D5', label: 'Wednesday (الأربعاء)' },
];

export const TimetableModal: React.FC<TimetableModalProps> = ({ isOpen, onClose, currentUser }) => {
  if (!isOpen) return null;

  const canEdit = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'USTHAD';

  const [activeDay, setActiveDay] = useState<string>('D1');
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);

  // Form field states
  const [slotDay, setSlotDay] = useState('D1');
  const [slotNumber, setSlotNumber] = useState(1);
  const [time, setTime] = useState('07:00 - 08:30');
  const [title, setTitle] = useState('');
  const [batch, setBatch] = useState('Hifz Batch A (Hifz Ul Uloom)');
  const [room, setRoom] = useState('Tahfeez Hall 101');
  const [mentor, setMentor] = useState('Usthad Mohammed Ajash T.');
  const [tag, setTag] = useState('Sabq Focus');
  const [colorTheme, setColorTheme] = useState('emerald');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadSlots();
  }, []);

  const loadSlots = async () => {
    setIsLoading(true);
    try {
      const data = await api.getTimetable();
      setSlots(data);
    } catch (err) {
      console.error('Failed to load timetable:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const daySlots = slots
    .filter((s) => s.day === activeDay)
    .sort((a, b) => a.slotNumber - b.slotNumber);

  const openAddSlot = () => {
    setEditingSlot(null);
    setSlotDay(activeDay);
    const nextSlotNum = daySlots.length > 0 ? Math.max(...daySlots.map((s) => s.slotNumber)) + 1 : 1;
    setSlotNumber(nextSlotNum);
    setTime('07:00 - 08:30');
    setTitle('');
    setBatch('Hifz Batch A (Hifz Ul Uloom)');
    setRoom('Tahfeez Hall 101');
    setMentor(currentUser?.role === 'USTHAD' ? currentUser.fullName : 'Usthad Mohammed Ajash T.');
    setTag('Sabq Focus');
    setColorTheme('emerald');
    setFormError(null);
    setShowFormModal(true);
  };

  const openEditSlot = (slot: TimetableSlot) => {
    setEditingSlot(slot);
    setSlotDay(slot.day);
    setSlotNumber(slot.slotNumber);
    setTime(slot.time);
    setTitle(slot.title);
    setBatch(slot.batch);
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

    const chosenColor = themeMap[colorTheme] || themeMap.emerald;

    try {
      const payload: Partial<TimetableSlot> = {
        day: slotDay,
        slotNumber: Number(slotNumber),
        time,
        title,
        batch,
        room,
        mentor,
        tag,
        color: chosenColor,
      };

      if (editingSlot) {
        const updated = await api.updateTimetableSlot(editingSlot.id, payload);
        setSlots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      } else {
        const created = await api.createTimetableSlot(payload);
        setSlots((prev) => [...prev, created]);
      }
      setShowFormModal(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save timetable period.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('Are you sure you want to delete this academic period?')) return;
    try {
      await api.deleteTimetableSlot(id);
      setSlots((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      alert(`Failed to delete period: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Academic Timetable & Routine</h2>
              <p className="text-xs text-slate-500">
                Markazul Hidayathil Islamiyya · Daily Hifz Routine 2026-27
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={openAddSlot}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Hour / Period</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Day Selectors */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-2">
            {DEFAULT_DAYS.map((d) => (
              <button
                key={d.id}
                onClick={() => setActiveDay(d.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  activeDay === d.id
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {d.id} · {d.label}
              </button>
            ))}
          </div>
          <span className="text-[11px] font-mono text-slate-400 shrink-0 hidden sm:inline">
            {daySlots.length} Periods Scheduled
          </span>
        </div>

        {/* Schedule Slots List */}
        <div className="p-6 space-y-3.5 overflow-y-auto flex-1">
          {daySlots.length > 0 ? (
            daySlots.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border flex items-start gap-4 transition-all hover:shadow-xs ${
                  item.color || 'bg-emerald-50 border-emerald-200 text-emerald-950'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-white/80 border border-current flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                  {item.slotNumber}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold font-mono tracking-tight opacity-75">
                      {item.time}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-white/70 px-2 py-0.5 rounded border border-current">
                      {item.tag || 'Sabq Focus'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {item.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-2 font-medium">
                    <span>{item.batch}</span>
                    <span>·</span>
                    <span>{item.room}</span>
                    <span>·</span>
                    <span className="text-emerald-800 font-semibold">{item.mentor}</span>
                  </div>
                </div>

                {/* Edit & Delete Action Buttons (Super Admin and Usthad) */}
                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0 self-start">
                    <button
                      onClick={() => openEditSlot(item)}
                      className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-white/60 rounded-lg transition-colors cursor-pointer"
                      title="Edit this hour"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSlot(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white/60 rounded-lg transition-colors cursor-pointer"
                      title="Delete this hour"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-12 text-center space-y-2">
              <Clock className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-700">No periods scheduled for {activeDay}</div>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {canEdit
                  ? 'Click "Add Hour / Period" above to configure the study sessions for this day.'
                  : 'Classes have not been scheduled yet for this day.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Daily minimum requirement: 1 Juz Manzil + 1/4 Juz Sabq</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {/* Add / Edit Timetable Hour Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-950 text-white">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm sm:text-base font-bold">
                  {editingSlot ? 'Edit Academic Hour' : 'Add New Academic Hour / Period'}
                </h3>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
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
                  <label className="block font-semibold text-slate-700 mb-1">
                    Day Schedule *
                  </label>
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
                  <label className="block font-semibold text-slate-700 mb-1">
                    Period / Hour # *
                  </label>
                  <input
                    required
                    type="number"
                    min={1}
                    max={12}
                    value={slotNumber}
                    onChange={(e) => setSlotNumber(Number(e.target.value))}
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
                  <label className="block font-semibold text-slate-700 mb-1">
                    Class / Batch
                  </label>
                  <input
                    type="text"
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Study Hall / Room
                  </label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mentor Usthad
                </label>
                <input
                  type="text"
                  value={mentor}
                  onChange={(e) => setMentor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Focus Tag
                  </label>
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
                    <option value="Islamic Studies">Islamic Studies</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Color Highlight
                  </label>
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
                  className="px-5 py-2 font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Saving...' : editingSlot ? 'Update Hour' : 'Add Hour'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
