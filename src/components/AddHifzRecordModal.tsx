import React, { useState } from 'react';
import { QURAN_SURAHS, JUZ_NAMES } from '../data/quranData';
import {
  Student,
  HifzRecord,
  HifzRecordType,
  PerformanceLevel,
  HifzResultStatus,
  UserProfile,
} from '../types';
import { X, BookOpen, Sparkles, CheckCircle2, AlertCircle, Info, Bookmark } from 'lucide-react';

interface AddHifzRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  currentUser: UserProfile;
  onAddRecord: (record: HifzRecord) => void;
}

export const AddHifzRecordModal: React.FC<AddHifzRecordModalProps> = ({
  isOpen,
  onClose,
  students,
  currentUser,
  onAddRecord,
}) => {
  if (!isOpen) return null;

  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || 'std_01');
  const [recordType, setRecordType] = useState<HifzRecordType>('SABQ');
  const [selectedSurahNumber, setSelectedSurahNumber] = useState<number>(1);
  const [startAyah, setStartAyah] = useState<number>(1);
  const [endAyah, setEndAyah] = useState<number>(7);
  const [selectedJuzNumber, setSelectedJuzNumber] = useState<number>(1);
  const [manzilSurahRange, setManzilSurahRange] = useState<string>('Full Juz 1');
  const [performance, setPerformance] = useState<PerformanceLevel>('Excellent');
  const [mistakeCount, setMistakeCount] = useState<number>(0);
  const [status, setStatus] = useState<HifzResultStatus>('Passed');
  const [remarks, setRemarks] = useState<string>('');
  const [nextLessonConfirmed, setNextLessonConfirmed] = useState<boolean>(true);
  const [nextLessonPosition, setNextLessonPosition] = useState<string>('');

  const currentSurah = QURAN_SURAHS.find((s) => s.number === selectedSurahNumber) || QURAN_SURAHS[0];
  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const handleSurahChange = (surahNum: number) => {
    setSelectedSurahNumber(surahNum);
    const surah = QURAN_SURAHS.find((s) => s.number === surahNum);
    if (surah) {
      setStartAyah(1);
      setEndAyah(Math.min(15, surah.ayahs));
      setNextLessonPosition(`Surah ${surah.name}: Ayah ${Math.min(16, surah.ayahs)} to ${Math.min(30, surah.ayahs)}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newRecord: HifzRecord = {
      id: `hifz_rec_${Date.now()}`,
      studentId: selectedStudentId,
      teacherId: currentUser.id,
      date: new Date().toISOString().split('T')[0],
      recordType: recordType,
      performance: performance,
      mistakeCount: mistakeCount,
      status: status,
      teacherRemarks: remarks || `${recordType} completed with ${performance} grade.`,
    };

    if (recordType === 'SABQ' || recordType === 'MURAJATH') {
      newRecord.surahNumber = currentSurah.number;
      newRecord.surahName = currentSurah.name;
      newRecord.surahArabic = currentSurah.arabicName;
      newRecord.startAyah = startAyah;
      newRecord.endAyah = endAyah;
      if (recordType === 'SABQ') {
        newRecord.nextLessonConfirmed = nextLessonConfirmed;
        newRecord.nextLessonPosition = nextLessonPosition || `Next lesson: Surah ${currentSurah.name} Ayah ${endAyah + 1}`;
      }
    } else {
      newRecord.juzNumber = selectedJuzNumber;
      newRecord.juzName = JUZ_NAMES.find((j) => j.juz === selectedJuzNumber)?.arabicName || `Juz ${selectedJuzNumber}`;
      newRecord.surahRangeText = manzilSurahRange;
    }

    onAddRecord(newRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92dvh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-emerald-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-800 flex items-center justify-center text-emerald-200">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Record Hifz Lesson & Evaluation</h2>
              <p className="text-xs text-emerald-200">
                Log daily Sabq, Murajath revision, or Manzil assessment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {/* Student selection & Category Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select Student
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-600 font-medium"
              >
                {students.map((std) => (
                  <option key={std.id} value={std.id}>
                    Roll #{std.rollNumber} - {std.fullName} (Juz {std.currentJuz})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Evaluation Category
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRecordType('SABQ')}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    recordType === 'SABQ'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sabq (السبق)
                </button>
                <button
                  type="button"
                  onClick={() => setRecordType('MURAJATH')}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    recordType === 'MURAJATH'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Murajath (المراجعة)
                </button>
                <button
                  type="button"
                  onClick={() => setRecordType('MANZIL')}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    recordType === 'MANZIL'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Manzil (المنزل)
                </button>
              </div>
            </div>
          </div>

          {/* Student Quick Stat Strip */}
          {selectedStudent && (
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between text-xs text-emerald-950">
              <div className="flex items-center gap-2.5">
                <img
                  src={selectedStudent.photo}
                  alt={selectedStudent.fullName}
                  className="w-8 h-8 rounded-full object-cover border border-emerald-200"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <div className="font-bold">{selectedStudent.fullName}</div>
                  <div className="text-[11px] text-emerald-800">
                    Current Memorization: Juz {selectedStudent.currentJuz} ({selectedStudent.completedJuzList.length} Juz Finished)
                  </div>
                </div>
              </div>
              <div className="text-right font-mono font-bold text-emerald-800">
                {selectedStudent.attendanceRate}% Attendance
              </div>
            </div>
          )}

          {/* Category-Specific Fields */}
          {recordType === 'MANZIL' ? (
            /* Manzil Fields */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Juz (1 to 30)
                </label>
                <select
                  value={selectedJuzNumber}
                  onChange={(e) => {
                    const j = Number(e.target.value);
                    setSelectedJuzNumber(j);
                    const jInfo = JUZ_NAMES.find((jn) => jn.juz === j);
                    setManzilSurahRange(jInfo ? `Juz ${j} (${jInfo.arabicName})` : `Juz ${j}`);
                  }}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden"
                >
                  {JUZ_NAMES.map((jn) => (
                    <option key={jn.juz} value={jn.juz}>
                      Juz {jn.juz} - {jn.arabicName} ({jn.startSurah})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Revision Range / Portions
                </label>
                <input
                  type="text"
                  value={manzilSurahRange}
                  onChange={(e) => setManzilSurahRange(e.target.value)}
                  placeholder="e.g. Full Juz 15 or 1st Half"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>
            </div>
          ) : (
            /* Sabq or Murajath Fields */
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Surah Selection
                  </label>
                  <select
                    value={selectedSurahNumber}
                    onChange={(e) => handleSurahChange(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden font-medium"
                  >
                    {QURAN_SURAHS.map((surah) => (
                      <option key={surah.number} value={surah.number}>
                        {surah.number}. {surah.name} ({surah.arabicName}) - {surah.ayahs} Ayahs
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Start Ayah
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={currentSurah.ayahs}
                    value={startAyah}
                    onChange={(e) => setStartAyah(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    End Ayah
                  </label>
                  <input
                    type="number"
                    min={startAyah}
                    max={currentSurah.ayahs}
                    value={endAyah}
                    onChange={(e) => setEndAyah(Math.min(currentSurah.ayahs, Number(e.target.value)))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>Selected: Surah {currentSurah.name} (Ayah {startAyah} to {endAyah})</span>
                <span className="font-arabic text-emerald-800 text-xs">سورة {currentSurah.arabicName}</span>
              </div>
            </div>
          )}

          {/* Performance & Mistakes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Recitation Performance
              </label>
              <select
                value={performance}
                onChange={(e) => setPerformance(e.target.value as PerformanceLevel)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden font-medium"
              >
                <option value="Excellent">Excellent (ممتاز)</option>
                <option value="Good">Good (جيد جداً)</option>
                <option value="Average">Average (متوسط)</option>
                <option value="Needs Improvement">Needs Improvement (يحتاج تحسين)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mistake Count (Lahn / Waqf)
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={mistakeCount}
                onChange={(e) => setMistakeCount(Math.max(0, Number(e.target.value)))}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Evaluation Result Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as HifzResultStatus)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden font-medium"
              >
                <option value="Passed">Passed (ناجح)</option>
                <option value="Revision Required">Revision Required (إعادة)</option>
                <option value="Not Passed">Not Passed (غير مجتاز)</option>
              </select>
            </div>
          </div>

          {/* Teacher Confirmation of Next Lesson Position (PRD Requirement) */}
          {recordType === 'SABQ' && (
            <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="confirmNext"
                  checked={nextLessonConfirmed}
                  onChange={(e) => setNextLessonConfirmed(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="confirmNext" className="text-xs font-semibold text-emerald-950 cursor-pointer">
                  Usthad Confirmation: Advance to Next Lesson Position
                </label>
              </div>
              <p className="text-[11px] text-emerald-800 leading-normal">
                PRD Rule: The application will not advance the student’s memorization position without explicit Usthad confirmation.
              </p>
              {nextLessonConfirmed && (
                <input
                  type="text"
                  value={nextLessonPosition}
                  onChange={(e) => setNextLessonPosition(e.target.value)}
                  placeholder={`e.g. Surah ${currentSurah.name}: Ayah ${endAyah + 1} to ${Math.min(currentSurah.ayahs, endAyah + 15)}`}
                  className="w-full px-3 py-2 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-hidden"
                />
              )}
            </div>
          )}

          {/* Teacher Remarks & Guidance */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Usthad Remarks & Tajweed Feedback
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Provide specific Tajweed pointers (e.g. Madd length, Qalqalah bounce, Ghunnah timing, or revision pacing)..."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-600"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Commit Hifz Record</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
