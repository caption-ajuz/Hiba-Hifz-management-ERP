import React, { useState, useEffect } from 'react';
import {
  FeedbackQuestion,
  MyFeedbackStatusResponse,
  UserProfile,
} from '../types';
import { api } from '../services/api';
import {
  X,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  feedbackStatus: MyFeedbackStatusResponse | null;
  isMandatory?: boolean;
  onSubmitted: () => void;
}

const RATING_OPTIONS = [
  { value: 5, label: 'EXCELLENT · 5' },
  { value: 4, label: 'VERY GOOD · 4' },
  { value: 3, label: 'GOOD · 3' },
  { value: 2, label: 'AVERAGE · 2' },
  { value: 1, label: 'NEEDS IMPROVEMENT · 1' },
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  feedbackStatus,
  isMandatory = false,
  onSubmitted,
}) => {
  const [statusData, setStatusData] = useState<MyFeedbackStatusResponse | null>(feedbackStatus);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'LIST' | 'QUESTIONNAIRE'>('LIST');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answersMap, setAnswersMap] = useState<Record<string, string | number | boolean>>({});
  const [surveyFilter, setSurveyFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    setStatusData(feedbackStatus);
  }, [feedbackStatus]);

  useEffect(() => {
    if (!isOpen || currentUser.role !== 'STUDENT') return;
    if (!feedbackStatus) {
      setIsLoading(true);
      api
        .getMyFeedbackStatus()
        .then((res) => setStatusData(res))
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, currentUser.role, feedbackStatus]);

  if (!isOpen) return null;

  const isEnabled = statusData?.isEnabled ?? false;
  const questions: FeedbackQuestion[] = statusData?.questions || [];
  const teachersList = statusData?.teachers || [];
  const totalCount = teachersList.length;
  const completedCount = teachersList.filter((t) => t.submitted).length;
  const pendingCount = totalCount - completedCount;
  const participationRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const selectedTeacher =
    teachersList.find((t) => t.id === selectedTeacherId) || teachersList[0] || null;
  const activeQuestion = questions[currentQuestionIndex];

  const handleStartSurvey = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    setCurrentQuestionIndex(0);
    setErrorMessage(null);
    setSuccessMessage(null);
    // Pre-initialize default answers cleanly as empty
    const init: Record<string, string | number | boolean> = {};
    questions.forEach((q) => {
      if (q.type === 'RATING_5') init[q.id] = 0;
      else init[q.id] = '';
    });
    setAnswersMap(init);
    setActiveView('QUESTIONNAIRE');
  };

  const setAnswer = (questionId: string, value: string | number | boolean) => {
    setErrorMessage(null);
    setAnswersMap((prev) => ({ ...prev, [questionId]: value }));
  };

  const isQuestionAnswered = (q: FeedbackQuestion, val: string | number | boolean | undefined) => {
    if (val === undefined || val === null) return false;
    if (q.type === 'RATING_5') return Number(val) >= 1;
    return String(val).trim().length > 0;
  };

  const handleNextOrSubmit = async () => {
    if (!activeQuestion || !selectedTeacher) return;

    if (activeQuestion.required && !isQuestionAnswered(activeQuestion, answersMap[activeQuestion.id])) {
      setErrorMessage('Please select or enter an answer for this required question before continuing.');
      return;
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setErrorMessage(null);
      return;
    }

    // Final validation of all required questions
    for (const q of questions) {
      if (q.required && !isQuestionAnswered(q, answersMap[q.id])) {
        setErrorMessage(`Please answer required question: "${q.prompt}"`);
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const formattedAnswers = questions
        .map((q) => {
          const val = answersMap[q.id];
          if (!isQuestionAnswered(q, val)) return null;
          return { questionId: q.id, value: val };
        })
        .filter((x): x is { questionId: string; value: string | number | boolean } => Boolean(x));

      await api.submitFeedback({
        teacherId: selectedTeacher.id,
        answers: formattedAnswers,
      });

      const refreshed = await api.getMyFeedbackStatus().catch(() => null);
      if (refreshed) {
        setStatusData(refreshed);
      } else {
        setStatusData((prev) =>
          prev
            ? {
                ...prev,
                teachers: prev.teachers.map((t) =>
                  t.id === selectedTeacher.id ? { ...t, submitted: true } : t
                ),
                submittedTeacherIds: [...prev.submittedTeacherIds, selectedTeacher.id],
                pendingTeachers: prev.pendingTeachers.filter((p) => p.id !== selectedTeacher.id),
              }
            : prev
        );
      }

      setSuccessMessage(`Feedback submitted for ${selectedTeacher.fullName} and sent to Mudir.`);
      setActiveView('LIST');
      setCurrentQuestionIndex(0);
      onSubmitted();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92dvh] flex flex-col">
        {/* Top Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {activeView === 'QUESTIONNAIRE'
                  ? 'Faculty Evaluation Form'
                  : 'Student Faculty Feedback'}
              </h2>
              <p className="text-xs text-slate-500">
                Markazul Hidayathil Islamiyya · {statusData?.term || '2026-27'}
              </p>
            </div>
          </div>

          {(!isMandatory || pendingCount === 0 || !isEnabled) && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
            <span>Loading feedback questions from Campus Mudir...</span>
          </div>
        ) : !isEnabled ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-900">
              Feedback Collection Currently Disabled
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              The Campus Mudir has turned off the feedback survey for this portal. Check back when the next evaluation window opens.
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : activeView === 'LIST' ? (
          <div className="p-6 space-y-4 overflow-y-auto">
            {isMandatory && pendingCount > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Required Feedback Survey Open</div>
                  <div className="text-[11px] text-amber-900 mt-0.5">
                    The Mudir has enabled faculty feedback. Please evaluate your pending teacher(s) below before continuing.
                  </div>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {statusData?.description && (
              <p className="text-xs text-slate-600 leading-relaxed">{statusData.description}</p>
            )}

            {/* Progress Stats */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-white rounded-xl border border-slate-200/60">
                  <div className="text-[11px] text-slate-500 font-medium">Assigned</div>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-0.5 tabular-nums">
                    {totalCount}
                  </div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200/60">
                  <div className="text-[11px] text-emerald-700 font-medium">Completed</div>
                  <div className="text-lg font-bold font-mono text-emerald-700 mt-0.5 tabular-nums">
                    {completedCount}
                  </div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200/60">
                  <div className="text-[11px] text-amber-700 font-medium">Pending</div>
                  <div className="text-lg font-bold font-mono text-amber-700 mt-0.5 tabular-nums">
                    {pendingCount}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                  <span>Completion Progress</span>
                  <span className="font-mono tabular-nums">{participationRate}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${participationRate}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              {(['ALL', 'PENDING', 'COMPLETED'] as const).map((filterKey) => (
                <button
                  key={filterKey}
                  type="button"
                  onClick={() => setSurveyFilter(filterKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    surveyFilter === filterKey
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {filterKey === 'ALL'
                    ? `All (${totalCount})`
                    : filterKey === 'PENDING'
                      ? `Pending (${pendingCount})`
                      : `Completed (${completedCount})`}
                </button>
              ))}
            </div>

            {/* Teacher List */}
            {teachersList.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-2xl">
                No faculty mentors are assigned to your batch yet.
              </div>
            ) : (
              <div className="space-y-3">
                {teachersList
                  .filter((t) =>
                    surveyFilter === 'ALL'
                      ? true
                      : surveyFilter === 'PENDING'
                        ? !t.submitted
                        : t.submitted
                  )
                  .map((teacher) => (
                    <div
                      key={teacher.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={teacher.photo || '/assets/images/avatar_usthad_male_1794118062835.jpg'}
                          alt={teacher.fullName}
                          className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {teacher.fullName}
                          </div>
                          {teacher.arabicTitle && (
                            <div className="text-[11px] font-arabic text-emerald-800 truncate">
                              {teacher.arabicTitle}
                            </div>
                          )}
                          <div className="text-[11px] text-slate-500 truncate">
                            {teacher.facultyDepartment} · {questions.length} Questions
                          </div>
                        </div>
                      </div>

                      {!teacher.submitted ? (
                        <button
                          type="button"
                          onClick={() => handleStartSurvey(teacher.id)}
                          disabled={questions.length === 0}
                          className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <span>Evaluate</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-emerald-700 font-bold flex items-center gap-1 text-xs shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Submitted</span>
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {pendingCount === 0 && totalCount > 0 && (
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Done · Continue to Portal
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Dynamic Mudir-Configured Questionnaire View */
          <div className="p-6 space-y-5 overflow-y-auto">
            {selectedTeacher && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={
                      selectedTeacher.photo ||
                      '/assets/images/avatar_usthad_male_1794118062835.jpg'
                    }
                    alt={selectedTeacher.fullName}
                    className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">
                      {selectedTeacher.fullName}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {selectedTeacher.facultyDepartment}
                    </div>
                    {selectedTeacher.arabicTitle && (
                      <div className="text-[11px] text-emerald-800 font-arabic truncate">
                        {selectedTeacher.arabicTitle}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('LIST')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer shrink-0"
                >
                  Back
                </button>
              </div>
            )}

            {activeQuestion && (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-slate-700">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </span>
                  <span
                    className={`font-semibold ${
                      activeQuestion.required ? 'text-rose-700' : 'text-slate-400'
                    }`}
                  >
                    {activeQuestion.required ? 'Required' : 'Optional'}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-slate-900 leading-snug">
                    {activeQuestion.prompt}
                  </h4>
                  {activeQuestion.arabicPrompt && (
                    <p dir="rtl" className="text-sm font-arabic text-emerald-800 mt-1">
                      {activeQuestion.arabicPrompt}
                    </p>
                  )}
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Answer Controls Based on Mudir Answer Type */}
                {activeQuestion.type === 'RATING_5' && (
                  <div className="space-y-2">
                    {RATING_OPTIONS.map((opt) => {
                      const isSelected = Number(answersMap[activeQuestion.id]) === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setAnswer(activeQuestion.id, opt.value)}
                          className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/70 font-bold text-slate-900'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-medium'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <span className="text-xs tracking-wide">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {activeQuestion.type === 'MULTIPLE_CHOICE' && (
                  <div className="space-y-2">
                    {(activeQuestion.options || []).map((opt) => {
                      const isSelected = String(answersMap[activeQuestion.id] || '') === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswer(activeQuestion.id, opt)}
                          className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/70 font-bold text-slate-900'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-medium'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <span className="text-xs">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {activeQuestion.type === 'YES_NO' && (
                  <div className="grid grid-cols-2 gap-3">
                    {['Yes', 'No'].map((opt) => {
                      const isSelected = String(answersMap[activeQuestion.id] || '') === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswer(activeQuestion.id, opt)}
                          className={`p-4 rounded-xl border text-center text-sm font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}

                {activeQuestion.type === 'TEXT' && (
                  <div>
                    <textarea
                      rows={4}
                      value={String(answersMap[activeQuestion.id] || '')}
                      onChange={(e) => setAnswer(activeQuestion.id, e.target.value)}
                      placeholder="Write your constructive feedback here..."
                      className="w-full p-3.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-700"
                    />
                  </div>
                )}

                {/* Navigation Footer */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => {
                      setErrorMessage(null);
                      setCurrentQuestionIndex((prev) => prev - 1);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleNextOrSubmit}
                    className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>
                      {currentQuestionIndex === questions.length - 1
                        ? 'Submit Feedback'
                        : 'Next Question'}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
