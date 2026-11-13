import React, { useState } from 'react';
import { X, Check, Plus, Star, Sparkles } from 'lucide-react';
import { ALL_FAVORITES_OPTIONS } from '../../data/studentPortalData';

interface StudentFavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  pinnedIds: string[];
  onSavePinned: (newIds: string[]) => void;
}

export const StudentFavoritesModal: React.FC<StudentFavoritesModalProps> = ({
  isOpen,
  onClose,
  pinnedIds,
  onSavePinned,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(pinnedIds);

  if (!isOpen) return null;

  const togglePin = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    onSavePinned(selectedIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Customize Favorite Menus</div>
              <div className="text-[11px] text-slate-500">Pin quick actions directly to your home screen</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content List */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          <div className="text-xs text-slate-500 px-1 pb-1">
            Selected: <strong className="text-slate-900">{selectedIds.length}</strong> items pinned
          </div>

          {ALL_FAVORITES_OPTIONS.map((item) => {
            const isPinned = selectedIds.includes(item.id);

            return (
              <div
                key={item.id}
                onClick={() => togglePin(item.id)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isPinned
                    ? 'border-indigo-300 bg-indigo-50/60 shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                      isPinned
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.title.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{item.title}</span>
                      {item.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500">{item.description}</div>
                  </div>
                </div>

                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                    isPinned
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-slate-300 bg-white text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => setSelectedIds([])}
            className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            Clear All
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Save Favorites
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
