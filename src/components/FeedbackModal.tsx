import React, { useState } from 'react';
import { TeacherEvaluation, UserProfile } from '../types';
import { MOCK_TEACHERS } from '../data/mockData';
import {
  X,
  MessageSquare,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  evaluations: TeacherEvaluation[];
  onCompleteEvaluation: (id: string, ratings: any) => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  evaluations,
  onCompleteEvaluation,
}) => {
  if (!isOpen) return null;

  const [activeView, setActiveView] = useState<'LIST' | 'QUESTIONNAIRE'>('LIST');
  const [selectedEvalId, setSelectedEvalId] = useState<string>(evaluations[0]?.id || 'eval_01');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number>(5);
  const [feedbackNotes, setFeedbackNotes] = useState<string>('');
  const [surveyFilter, setSurveyFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  const activeEval = evaluations.find((e) => e.id === selectedEvalId) || evaluations[0];
  const assignedTeacher = MOCK_TEACHERS.find((t) => t.id === activeEval?.teacherId) || MOCK_TEACHERS[0];

  const surveyQuestions = [
    {
      id: 'q1',
      title: 'Ability to Inspire You & Instill Reverence for the Quran',
      description: 'Does the Usthad encourage daily dedication and love for recitation?',
    },
    {
      id: 'q2',
      title: 'Precision in Makharij, Tajweed Rules & Sifat Guidance',
      description: 'How thorough is the Usthad in correcting subtle pronunciation mistakes during Sabq?',
    },
    {
      id: 'q3',
      title: 'Punctuality, Regularity & Dedication to Daily Hours',
      description: 'Is the mentor present on time for Fajr Sabq and afternoon Manzil sessions?',
    },
    {
      id: 'q4',
      title: 'Patience & Support with Difficult Portions & Repetitions',
      description: 'Does the Usthad provide constructive pacing and encouraging feedback?',
    },
  ];

  const ratingOptions = [
    { value: 5, label: 'EXCELLENT: 5' },
    { value: 4, label: 'VERY GOOD: 4' },
    { value: 3, label: 'GOOD: 3' },
    { value: 2, label: 'AVERAGE: 2' },
    { value: 1, label: 'POOR: 1' },
  ];

  const pendingCount = evaluations.filter((e) => e.status === 'Pending').length;
  const completedCount = evaluations.filter((e) => e.status === 'Completed').length;
  const totalCount = evaluations.length;
  const participationRate = Math.round((completedCount / totalCount) * 100);

  const handleNextOrSubmit = () => {
    if (currentQuestionIndex < surveyQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Completed questionnaire
      onCompleteEvaluation(activeEval.id, {
        inspiringAbility: selectedOption,
        tajweedGuidance: 5,
        punctuality: 5,
        revisionPatience: 5,
        generalFeedback: feedbackNotes || 'Completed faculty review.',
      });
      setActiveView('LIST');
      setCurrentQuestionIndex(0);
    }
  };

  const handleStartSurvey = (evalId: string) => {
    setSelectedEvalId(evalId);
    setCurrentQuestionIndex(0);
    setSelectedOption(5);
    setActiveView('QUESTIONNAIRE');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92dvh] flex flex-col">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {activeView === 'QUESTIONNAIRE' ? 'Student Evaluation on Teachers' : 'Faculty Feedback'}
              </h2>
              <p className="text-xs text-slate-500">
                Markazul Hidayathil Islamiyya · Odd Semester 2026-27
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {activeView === 'LIST' ? (
          /* List View matching user reference screenshot */
          <div className="p-6 space-y-5 overflow-y-auto">
            {/* Top Stat Strip (Matching Reference Screen: 5 Total, 4 Completed, 1 Pending, 80% bar) */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-white rounded-xl border border-slate-200/60">
                  <div className="text-xs text-slate-500 font-medium">Total</div>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">{totalCount}</div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200/60">
                  <div className="text-xs text-emerald-700 font-medium">Completed</div>
                  <div className="text-lg font-bold font-mono text-emerald-700 mt-0.5">{completedCount}</div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200/60">
                  <div className="text-xs text-amber-700 font-medium">Pending</div>
                  <div className="text-lg font-bold font-mono text-amber-700 mt-0.5">{pendingCount}</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                  <span>Overall Participation</span>
                  <span className="font-mono">{participationRate}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${participationRate}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Filter Tabs matching reference screenshot */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSurveyFilter('ALL')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  surveyFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({totalCount})
              </button>
              <button
                onClick={() => setSurveyFilter('PENDING')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  surveyFilter === 'PENDING'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setSurveyFilter('COMPLETED')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  surveyFilter === 'COMPLETED'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Completed ({completedCount})
              </button>
            </div>

            {/* Survey Cards matching reference screenshot */}
            <div className="space-y-3">
              {evaluations
                .filter((e) =>
                  surveyFilter === 'ALL' ? true : surveyFilter === 'PENDING' ? e.status === 'Pending' : e.status === 'Completed'
                )
                .map((ev) => {
                  const teacher = MOCK_TEACHERS.find((t) => t.id === ev.teacherId) || MOCK_TEACHERS[0];
                  const isPending = ev.status === 'Pending';

                  return (
                    <div
                      key={ev.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 transition-all space-y-3 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            Student Evaluation on Teachers {ev.term}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Course: {ev.course}
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isPending ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {ev.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                        <img
                          src={teacher.photo}
                          alt={teacher.fullName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900">{teacher.fullName}</div>
                          <div className="text-[11px] text-slate-500 font-arabic">{teacher.arabicTitle}</div>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-400 font-mono">Date: {ev.date}</span>
                        {isPending ? (
                          <button
                            onClick={() => handleStartSurvey(ev.id)}
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                          >
                            <span>Submit Now</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-emerald-700 font-medium flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Submitted</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          /* Questionnaire View matching reference screenshot */
          <div className="p-6 space-y-5 overflow-y-auto">
            {/* Teacher Header Card */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-3.5">
              <img
                src={assignedTeacher.photo}
                alt={assignedTeacher.fullName}
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs"
                referrerPolicy="no-referrer"
              />
              <div>
                <h3 className="text-sm font-bold text-slate-900">{assignedTeacher.fullName}</h3>
                <div className="text-xs text-slate-500 font-medium">{activeEval.course}</div>
                <div className="text-[11px] text-emerald-700 font-arabic">{assignedTeacher.arabicTitle}</div>
              </div>
            </div>

            {/* Question Counter Pill */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-lg">
                Question: {currentQuestionIndex + 1}/{surveyQuestions.length}
              </span>
              <span className="text-xs text-slate-400 font-mono">Evaluation Step</span>
            </div>

            {/* Active Question */}
            <div>
              <h4 className="text-base font-bold text-slate-900 leading-snug">
                {surveyQuestions[currentQuestionIndex].title}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                {surveyQuestions[currentQuestionIndex].description}
              </p>
            </div>

            {/* Options List matching user screenshot */}
            <div className="space-y-2.5 pt-2">
              {ratingOptions.map((opt) => {
                const isSelected = selectedOption === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => setSelectedOption(opt.value)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/60 font-bold text-slate-900 ring-1 ring-emerald-500/30'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                    </div>
                    <span className="text-xs tracking-wide">{opt.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Final feedback comment box if on last question */}
            {currentQuestionIndex === surveyQuestions.length - 1 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Optional Comments & Appreciation
                </label>
                <textarea
                  rows={2}
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  placeholder="Share any special gratitude or pointers for the Usthad..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-600"
                />
              </div>
            )}

            {/* Questionnaire Footer navigation */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <button
                onClick={handleNextOrSubmit}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {currentQuestionIndex === surveyQuestions.length - 1 ? 'Submit Evaluation' : 'Next Question'}
              </button>

              <button
                disabled={currentQuestionIndex >= surveyQuestions.length - 1}
                onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
