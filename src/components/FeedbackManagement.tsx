import React, { useState, useEffect, useMemo } from 'react';
import {
  FeedbackConfig,
  FeedbackQuestion,
  FeedbackAnswerType,
  FeedbackSubmission,
  TeacherFeedbackReport,
  Teacher,
  ClassBatch,
  UserProfile,
} from '../types';
import { api } from '../services/api';
import { subscribeToRealtimeEvents } from '../services/socket';
import {
  MessageSquare,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  CheckCircle2,
  AlertCircle,
  Power,
  Send,
  Users,
  FileText,
  SlidersHorizontal,
  Star,
  Loader2,
  Building2,
} from 'lucide-react';

interface FeedbackManagementProps {
  currentUser: UserProfile;
  teachers: Teacher[];
  classes: ClassBatch[];
  config: FeedbackConfig | null;
  onConfigUpdated: (cfg: FeedbackConfig) => void;
}

const ANSWER_TYPE_LABELS: Record<FeedbackAnswerType, string> = {
  RATING_5: '5-Point Rating Scale (1–5)',
  MULTIPLE_CHOICE: 'Multiple Choice Options',
  YES_NO: 'Yes / No Choice',
  TEXT: 'Open Text Response',
};

export const FeedbackManagement: React.FC<FeedbackManagementProps> = ({
  currentUser,
  teachers,
  config: initialConfig,
  onConfigUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'questions' | 'responses' | 'reports'>('questions');
  const [isEnabled, setIsEnabled] = useState<boolean>(initialConfig?.isEnabled ?? true);
  const [term, setTerm] = useState<string>(initialConfig?.term || '2026-27 (Odd Semester)');
  const [description, setDescription] = useState<string>(
    initialConfig?.description ||
      'Please evaluate your assigned Usthad & faculty mentors honestly to help improve teaching quality.'
  );
  const [questions, setQuestions] = useState<FeedbackQuestion[]>(initialConfig?.questions || []);

  // New / Add question form state
  const [newPrompt, setNewPrompt] = useState('');
  const [newArabicPrompt, setNewArabicPrompt] = useState('');
  const [newType, setNewType] = useState<FeedbackAnswerType>('RATING_5');
  const [newRequired, setNewRequired] = useState(true);
  const [newOptionsText, setNewOptionsText] = useState('Always, Often, Sometimes, Rarely');

  // Submissions & Reports state
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([]);
  const [reports, setReports] = useState<TeacherFeedbackReport[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Faculty & Teacher selection for Responses tab
  const [selectedFaculty, setSelectedFaculty] = useState<string>('ALL');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

  // Report composer state
  const [reportTeacherId, setReportTeacherId] = useState<string>(teachers[0]?.id || '');
  const [summaryText, setSummaryText] = useState('');
  const [suggestionsText, setSuggestionsText] = useState('');
  const [isSendingReport, setIsSendingReport] = useState(false);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4500);
  };

  useEffect(() => {
    if (initialConfig) {
      setIsEnabled(Boolean(initialConfig.isEnabled));
      setTerm(initialConfig.term || '2026-27 (Odd Semester)');
      setDescription(initialConfig.description || '');
      setQuestions(
        [...(initialConfig.questions || [])].sort(
          (a, b) => Number(a.order || 0) - Number(b.order || 0)
        )
      );
    }
  }, [initialConfig]);

  useEffect(() => {
    if (!reportTeacherId && teachers.length > 0) {
      setReportTeacherId(teachers[0].id);
    }
  }, [teachers, reportTeacherId]);

  const loadFeedbackData = async () => {
    setIsLoadingData(true);
    try {
      const [cfgRes, subsRes, repRes] = await Promise.all([
        api.getFeedbackConfig(currentUser.campusId),
        api.getFeedbackSubmissions(),
        api.getFeedbackReports(),
      ]);

      if (cfgRes) {
        setIsEnabled(Boolean(cfgRes.isEnabled));
        setTerm(cfgRes.term || '2026-27 (Odd Semester)');
        setDescription(cfgRes.description || '');
        setQuestions(
          [...(cfgRes.questions || [])].sort(
            (a, b) => Number(a.order || 0) - Number(b.order || 0)
          )
        );
        onConfigUpdated(cfgRes);
      }
      if (Array.isArray(subsRes)) setSubmissions(subsRes);
      if (Array.isArray(repRes)) setReports(repRes);
    } catch (err: any) {
      showNotice('error', err?.message || 'Failed to load feedback records.');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadFeedbackData();

    const unsubscribe = subscribeToRealtimeEvents({
      onFeedbackSubmitted: (sub: FeedbackSubmission) => {
        setSubmissions((prev) => {
          const rest = prev.filter((item) => item.id !== sub.id);
          return [sub, ...rest];
        });
      },
      onFeedbackReportUpdated: (rep: TeacherFeedbackReport) => {
        setReports((prev) => {
          const rest = prev.filter((item) => item.id !== rep.id);
          return [rep, ...rest];
        });
      },
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.campusId]);

  // Immediate ON/OFF Toggle persistence
  const handleToggleFeedback = async () => {
    const nextEnabled = !isEnabled;
    setIsToggling(true);
    try {
      const updated = await api.updateFeedbackConfig({
        isEnabled: nextEnabled,
        term: term.trim() || '2026-27 (Odd Semester)',
        description: description.trim(),
        questions: questions.map((q, idx) => ({ ...q, order: idx + 1 })),
      });
      setIsEnabled(Boolean(updated.isEnabled));
      onConfigUpdated(updated);
      showNotice(
        'success',
        updated.isEnabled
          ? 'Feedback section enabled. Students will be prompted to submit feedback after logging in.'
          : 'Feedback section disabled. Hidden from all Student Portal views.'
      );
    } catch (err: any) {
      showNotice('error', err?.message || 'Failed to toggle feedback state.');
    } finally {
      setIsToggling(false);
    }
  };

  const handleSaveConfig = async () => {
    if (questions.length === 0) {
      showNotice('error', 'Please add at least one feedback question before saving.');
      return;
    }

    for (const q of questions) {
      if (!q.prompt.trim()) {
        showNotice('error', 'Every question must have prompt text.');
        return;
      }
      if (q.type === 'MULTIPLE_CHOICE' && (!q.options || q.options.filter(Boolean).length < 2)) {
        showNotice(
          'error',
          `Multiple choice question "${q.prompt}" must have at least 2 answer options.`
        );
        return;
      }
    }

    setIsSavingConfig(true);
    try {
      const updated = await api.updateFeedbackConfig({
        isEnabled,
        term: term.trim() || '2026-27 (Odd Semester)',
        description: description.trim(),
        questions: questions.map((q, idx) => ({ ...q, order: idx + 1 })),
      });
      setQuestions(
        [...(updated.questions || [])].sort(
          (a, b) => Number(a.order || 0) - Number(b.order || 0)
        )
      );
      onConfigUpdated(updated);
      showNotice('success', 'Feedback questions & configuration saved.');
    } catch (err: any) {
      showNotice('error', err?.message || 'Failed to save feedback configuration.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrompt.trim()) {
      showNotice('error', 'Enter question text first.');
      return;
    }

    const parsedOptions =
      newType === 'MULTIPLE_CHOICE'
        ? newOptionsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : newType === 'YES_NO'
          ? ['Yes', 'No']
          : [];

    if (newType === 'MULTIPLE_CHOICE' && parsedOptions.length < 2) {
      showNotice('error', 'Provide at least 2 comma-separated choices for Multiple Choice.');
      return;
    }

    const newQ: FeedbackQuestion = {
      id: `q_${Date.now()}`,
      prompt: newPrompt.trim(),
      arabicPrompt: newArabicPrompt.trim(),
      type: newType,
      required: newRequired,
      options: parsedOptions,
      isActive: true,
      order: questions.length + 1,
    };

    setQuestions((prev) => [...prev, newQ]);
    setNewPrompt('');
    setNewArabicPrompt('');
    setNewType('RATING_5');
    setNewRequired(true);
    showNotice('success', 'Question added to draft. Click "Save Configuration" to publish.');
  };

  const updateQuestionField = (id: string, patch: Partial<FeedbackQuestion>) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const merged = { ...q, ...patch };
        if (patch.type === 'YES_NO') {
          merged.options = ['Yes', 'No'];
        } else if (patch.type === 'MULTIPLE_CHOICE' && (!merged.options || merged.options.length < 2)) {
          merged.options = ['Excellent', 'Satisfactory', 'Needs Attention'];
        } else if (patch.type === 'RATING_5' || patch.type === 'TEXT') {
          merged.options = [];
        }
        return merged;
      })
    );
  };

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    setQuestions((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, item);
      return copy.map((q, idx) => ({ ...q, order: idx + 1 }));
    });
  };

  const deleteQuestion = (id: string) => {
    setQuestions((prev) =>
      prev.filter((q) => q.id !== id).map((q, idx) => ({ ...q, order: idx + 1 }))
    );
  };

  // Faculty & Teacher aggregation from both campus teachers and submitted responses
  const facultyDirectory = useMemo(() => {
    const map = new Map<
      string,
      {
        facultyName: string;
        teachers: Array<{
          id: string;
          fullName: string;
          arabicTitle?: string;
          facultyDepartment: string;
          submissionCount: number;
          avgRating: number | null;
        }>;
      }
    >();

    const subsByTeacher = new Map<string, FeedbackSubmission[]>();
    submissions.forEach((sub) => {
      const list = subsByTeacher.get(sub.teacherId) || [];
      list.push(sub);
      subsByTeacher.set(sub.teacherId, list);
    });

    const addTeacherEntry = (
      id: string,
      fullName: string,
      arabicTitle: string | undefined,
      facultyDept: string
    ) => {
      const dept = facultyDept || 'Tahfeezul Quran Faculty';
      if (!map.has(dept)) {
        map.set(dept, { facultyName: dept, teachers: [] });
      }
      const group = map.get(dept)!;
      if (group.teachers.some((t) => t.id === id)) return;

      const tSubs = subsByTeacher.get(id) || [];
      const ratingValues: number[] = [];
      tSubs.forEach((s) =>
        s.answers.forEach((a) => {
          if (a.type === 'RATING_5' && typeof a.value === 'number') {
            ratingValues.push(a.value);
          }
        })
      );
      const avgRating =
        ratingValues.length > 0
          ? Number((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length).toFixed(2))
          : null;

      group.teachers.push({
        id,
        fullName,
        arabicTitle,
        facultyDepartment: dept,
        submissionCount: tSubs.length,
        avgRating,
      });
    };

    teachers.forEach((t) =>
      addTeacherEntry(
        t.id,
        t.fullName,
        t.arabicTitle,
        t.specialization || 'Tahfeezul Quran Faculty'
      )
    );

    submissions.forEach((s) =>
      addTeacherEntry(s.teacherId, s.teacherName, undefined, s.facultyDepartment)
    );

    return Array.from(map.values());
  }, [teachers, submissions]);

  const facultyNames = useMemo(
    () => facultyDirectory.map((f) => f.facultyName),
    [facultyDirectory]
  );

  const visibleTeachers = useMemo(() => {
    const groups =
      selectedFaculty === 'ALL'
        ? facultyDirectory
        : facultyDirectory.filter((f) => f.facultyName === selectedFaculty);
    return groups.flatMap((g) => g.teachers);
  }, [facultyDirectory, selectedFaculty]);

  useEffect(() => {
    if (visibleTeachers.length > 0 && !visibleTeachers.some((t) => t.id === selectedTeacherId)) {
      setSelectedTeacherId(visibleTeachers[0].id);
    }
  }, [visibleTeachers, selectedTeacherId]);

  const selectedTeacherInfo = useMemo(
    () => visibleTeachers.find((t) => t.id === selectedTeacherId) || null,
    [visibleTeachers, selectedTeacherId]
  );

  const selectedTeacherSubmissions = useMemo(
    () => submissions.filter((s) => s.teacherId === selectedTeacherId),
    [submissions, selectedTeacherId]
  );

  // Per-question analytics for selected teacher
  const teacherQuestionSummaries = useMemo(() => {
    if (selectedTeacherSubmissions.length === 0) return [];
    const qMap = new Map<
      string,
      {
        questionId: string;
        prompt: string;
        type: FeedbackAnswerType;
        values: Array<string | number | boolean>;
      }
    >();

    selectedTeacherSubmissions.forEach((sub) => {
      sub.answers.forEach((ans) => {
        if (!qMap.has(ans.questionId)) {
          qMap.set(ans.questionId, {
            questionId: ans.questionId,
            prompt: ans.questionPrompt,
            type: ans.type,
            values: [],
          });
        }
        qMap.get(ans.questionId)!.values.push(ans.value);
      });
    });

    return Array.from(qMap.values()).map((entry): {
      questionId: string;
      prompt: string;
      type: FeedbackAnswerType;
      avgRating: string | null;
      count: number;
      breakdown: Record<string, number> | null;
      textEntries?: string[];
    } => {
      if (entry.type === 'RATING_5') {
        const nums = entry.values.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
        const avg = nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : '0.00';
        return {
          questionId: entry.questionId,
          prompt: entry.prompt,
          type: entry.type,
          avgRating: avg,
          count: nums.length,
          breakdown: null,
        };
      }
      if (entry.type === 'MULTIPLE_CHOICE' || entry.type === 'YES_NO') {
        const counts: Record<string, number> = {};
        entry.values.forEach((v) => {
          const key = String(v);
          counts[key] = (counts[key] || 0) + 1;
        });
        return {
          questionId: entry.questionId,
          prompt: entry.prompt,
          type: entry.type,
          avgRating: null,
          count: entry.values.length,
          breakdown: counts,
        };
      }
      return {
        questionId: entry.questionId,
        prompt: entry.prompt,
        type: entry.type,
        avgRating: null,
        count: entry.values.length,
        breakdown: null,
        textEntries: entry.values.map((v) => String(v)),
      };
    });
  }, [selectedTeacherSubmissions]);

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTeacherId) {
      showNotice('error', 'Please select a teacher to send the feedback report.');
      return;
    }
    if (summaryText.trim().length < 3) {
      showNotice('error', 'Please enter a summarized feedback report before sending.');
      return;
    }

    setIsSendingReport(true);
    try {
      const targetTeacher = teachers.find((t) => t.id === reportTeacherId);
      const saved = await api.saveFeedbackReport({
        teacherId: reportTeacherId,
        facultyLabel: targetTeacher?.specialization || 'Tahfeezul Quran Faculty',
        term,
        summaryText: summaryText.trim(),
        suggestionsText: suggestionsText.trim(),
      });
      setReports((prev) => [saved, ...prev.filter((r) => r.id !== saved.id)]);
      setSummaryText('');
      setSuggestionsText('');
      showNotice(
        'success',
        `Feedback summary & suggestions sent to ${saved.teacherName}'s Faculty Portal.`
      );
    } catch (err: any) {
      showNotice('error', err?.message || 'Failed to send report to teacher.');
    } finally {
      setIsSendingReport(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 pb-20">
      {/* Top Status Notice */}
      {notice && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Command Header with ON / OFF Master Toggle */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
            <MessageSquare className="w-4 h-4" />
            <span>Mudir Feedback Control Center</span>
            <span>·</span>
            <span className="font-mono">{term}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Faculty Feedback Management
          </h1>
        </div>

        {/* Master Toggle Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Student Feedback Portal
              </div>
              <div
                className={`text-xs font-extrabold ${
                  isEnabled ? 'text-emerald-700' : 'text-slate-500'
                }`}
              >
                {isEnabled ? 'ENABLED (Active for Students)' : 'DISABLED (Hidden from Students)'}
              </div>
            </div>
            <button
              type="button"
              disabled={isToggling}
              onClick={handleToggleFeedback}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isEnabled
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
              }`}
            >
              {isToggling ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Power className="w-3.5 h-3.5" />
              )}
              <span>{isEnabled ? 'Turn OFF' : 'Turn ON'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Active Questions
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 mt-1 tabular-nums">
            {questions.filter((q) => q.isActive !== false).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
            {questions.filter((q) => q.required).length} required on login
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Submitted Reviews
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-700 mt-1 tabular-nums">
            {submissions.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Recorded student evaluations</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Faculties Evaluated
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 mt-1 tabular-nums">
            {facultyNames.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
            {teachers.length} campus mentors
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Reports Sent
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 mt-1 tabular-nums">
            {reports.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Published to Usthad portals</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('questions')}
          className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'questions'
              ? 'bg-emerald-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>1. Questions & Answer Types ({questions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('responses')}
          className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'responses'
              ? 'bg-emerald-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>2. Faculty & Teacher Responses ({submissions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-emerald-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>3. Summary & Suggestions ({reports.length})</span>
        </button>
      </div>

      {/* ==================== TAB 1: QUESTION BUILDER ==================== */}
      {activeTab === 'questions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Term Settings + Add Question Form */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Cycle & Student Guidance</h2>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Evaluation Term
                </label>
                <input
                  type="text"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-emerald-700"
                  placeholder="2026-27 (Odd Semester)"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Instructions Shown to Students
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-emerald-700"
                />
              </div>
            </div>

            <form
              onSubmit={handleAddQuestion}
              className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Add New Question</h2>
                <Plus className="w-4 h-4 text-emerald-700" />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Question Prompt *
                </label>
                <textarea
                  rows={2}
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  placeholder="e.g., How effectively does the Usthad correct Tajweed & Makharij?"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-emerald-700"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Arabic Prompt (Optional · El Messiri)
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={newArabicPrompt}
                  onChange={(e) => setNewArabicPrompt(e.target.value)}
                  placeholder="جودة تعليم التجويد ومخارج الحروف"
                  className="w-full px-3 py-2 text-xs font-arabic border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Answer Format
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as FeedbackAnswerType)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-emerald-700"
                >
                  {Object.entries(ANSWER_TYPE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {newType === 'MULTIPLE_CHOICE' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Answer Choices (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newOptionsText}
                    onChange={(e) => setNewOptionsText(e.target.value)}
                    placeholder="Always, Often, Sometimes, Rarely"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-emerald-700"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newRequired}
                  onChange={(e) => setNewRequired(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                />
                <span>Required answer before student submission</span>
              </label>

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question to Questionnaire</span>
              </button>
            </form>
          </div>

          {/* Right: Question List & Publish */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Configured Student Questionnaire ({questions.length} Questions)
                </h2>
              </div>

              <button
                type="button"
                disabled={isSavingConfig}
                onClick={handleSaveConfig}
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                {isSavingConfig ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save Configuration</span>
              </button>
            </div>

            {questions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-2xl">
                No questions added yet. Add your first question using the form on the left.
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className={`p-4 rounded-2xl border space-y-3 ${
                      q.isActive !== false
                        ? 'border-slate-200 bg-slate-50/60'
                        : 'border-slate-200 bg-slate-100/70 opacity-75'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <span className="font-mono text-emerald-800">Q{idx + 1}</span>
                        <span>·</span>
                        <span>{ANSWER_TYPE_LABELS[q.type]}</span>
                        {q.required && (
                          <>
                            <span>·</span>
                            <span className="text-rose-700">Required</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveQuestion(idx, -1)}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 disabled:opacity-40 cursor-pointer"
                          title="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveQuestion(idx, 1)}
                          disabled={idx === questions.length - 1}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 disabled:opacity-40 cursor-pointer"
                          title="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteQuestion(q.id)}
                          className="p-1.5 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Remove question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          English Prompt
                        </label>
                        <input
                          type="text"
                          value={q.prompt}
                          onChange={(e) => updateQuestionField(q.id, { prompt: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-700"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Arabic Title (El Messiri)
                        </label>
                        <input
                          type="text"
                          dir="rtl"
                          value={q.arabicPrompt || ''}
                          onChange={(e) =>
                            updateQuestionField(q.id, { arabicPrompt: e.target.value })
                          }
                          className="w-full px-3 py-2 text-xs font-arabic bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-700"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Answer Type
                        </label>
                        <select
                          value={q.type}
                          onChange={(e) =>
                            updateQuestionField(q.id, {
                              type: e.target.value as FeedbackAnswerType,
                            })
                          }
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                        >
                          {Object.entries(ANSWER_TYPE_LABELS).map(([k, label]) => (
                            <option key={k} value={k}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 pt-4 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={(e) =>
                            updateQuestionField(q.id, { required: e.target.checked })
                          }
                          className="rounded border-slate-300 text-emerald-700"
                        />
                        <span>Required Answer</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 pt-4 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={q.isActive !== false}
                          onChange={(e) =>
                            updateQuestionField(q.id, { isActive: e.target.checked })
                          }
                          className="rounded border-slate-300 text-emerald-700"
                        />
                        <span>Active in Form</span>
                      </label>
                    </div>

                    {q.type === 'MULTIPLE_CHOICE' && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Choices (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={(q.options || []).join(', ')}
                          onChange={(e) =>
                            updateQuestionField(q.id, {
                              options: e.target.value.split(',').map((s) => s.trim()),
                            })
                          }
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 2: FACULTY-WISE & TEACHER-WISE RESPONSES ==================== */}
      {activeTab === 'responses' && (
        <div className="space-y-4">
          {/* Faculty Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Building2 className="w-4 h-4 text-emerald-700" />
              <span>Select Faculty Department:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedFaculty('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  selectedFaculty === 'ALL'
                    ? 'bg-emerald-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Faculties ({facultyNames.length})
              </button>
              {facultyNames.map((fac) => (
                <button
                  key={fac}
                  type="button"
                  onClick={() => setSelectedFaculty(fac)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    selectedFaculty === fac
                      ? 'bg-emerald-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {fac}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left: Teacher Selector Organized by Faculty */}
            <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 space-y-3 h-fit">
              <div className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-100">
                Faculty Mentors ({visibleTeachers.length})
              </div>

              {visibleTeachers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No teachers found in this faculty.
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleTeachers.map((t) => {
                    const isSelected = t.id === selectedTeacherId;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTeacherId(t.id)}
                        className={`w-full p-3 rounded-xl border text-left transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/70'
                            : 'border-slate-200 hover:bg-slate-50 bg-white'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {t.fullName}
                          </div>
                          {t.arabicTitle && (
                            <div className="text-[11px] font-arabic text-emerald-800 truncate">
                              {t.arabicTitle}
                            </div>
                          )}
                          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                            {t.facultyDepartment}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                            {t.submissionCount} reviews
                          </div>
                          {t.avgRating !== null && (
                            <div className="text-[11px] font-mono font-bold text-emerald-700 tabular-nums">
                              {t.avgRating} / 5.0
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Selected Teacher Analytics & Student Submissions */}
            <div className="lg:col-span-2 space-y-4">
              {selectedTeacherInfo ? (
                <>
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                        {selectedTeacherInfo.facultyDepartment}
                      </div>
                      <h2 className="text-lg font-extrabold text-slate-900">
                        {selectedTeacherInfo.fullName}
                      </h2>
                      <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                        {selectedTeacherSubmissions.length} student submissions
                        {selectedTeacherInfo.avgRating !== null
                          ? ` · Overall Rating ${selectedTeacherInfo.avgRating} / 5.0`
                          : ''}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setReportTeacherId(selectedTeacherInfo.id);
                        setActiveTab('reports');
                      }}
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Write Summary for Teacher</span>
                    </button>
                  </div>

                  {/* Per-Question Breakdown */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                    <h3 className="text-sm font-bold text-slate-900">
                      Question-Wise Response Summary
                    </h3>
                    {isLoadingData ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        Loading submitted responses...
                      </div>
                    ) : teacherQuestionSummaries.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                        No student feedback submitted for {selectedTeacherInfo.fullName} yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {teacherQuestionSummaries.map((item) => (
                          <div
                            key={item.questionId}
                            className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="text-xs font-bold text-slate-900">{item.prompt}</div>
                              <span className="text-[11px] font-mono text-slate-500 shrink-0 tabular-nums">
                                {item.count} responses
                              </span>
                            </div>

                            {item.avgRating && (
                              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 font-mono tabular-nums">
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                <span>Average Score: {item.avgRating} / 5.00</span>
                              </div>
                            )}

                            {item.breakdown && (
                              <div className="flex flex-wrap gap-3 text-xs text-slate-700 pt-1">
                                {Object.entries(item.breakdown).map(([opt, count]) => (
                                  <span key={opt} className="font-mono tabular-nums">
                                    <strong>{opt}</strong>: {count}
                                  </span>
                                ))}
                              </div>
                            )}

                            {item.textEntries && (
                              <div className="space-y-1.5 pt-1">
                                {item.textEntries.map((txt, idx) => (
                                  <div
                                    key={idx}
                                    className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2"
                                  >
                                    "{txt}"
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Individual Student Submissions */}
                  {selectedTeacherSubmissions.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                      <h3 className="text-sm font-bold text-slate-900">
                        Individual Student Submissions ({selectedTeacherSubmissions.length})
                      </h3>
                      <div className="space-y-3">
                        {selectedTeacherSubmissions.map((sub) => (
                          <div
                            key={sub.id}
                            className="p-4 rounded-xl border border-slate-200 bg-white space-y-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 text-xs">
                              <div className="font-bold text-slate-900">
                                {sub.studentName}
                                {sub.admissionNumber && (
                                  <span className="font-mono font-normal text-slate-500 ml-2">
                                    Adm: {sub.admissionNumber}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {sub.batchName} · {new Date(sub.submittedAt).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="space-y-1.5 text-xs">
                              {sub.answers.map((ans) => (
                                <div
                                  key={ans.questionId}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-slate-50 last:border-b-0"
                                >
                                  <span className="text-slate-600">{ans.questionPrompt}</span>
                                  <span className="font-bold text-slate-900 font-mono shrink-0">
                                    {ans.type === 'RATING_5'
                                      ? `${ans.value} / 5`
                                      : String(ans.value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                  Select a teacher on the left to inspect faculty feedback responses.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: SUMMARY & SUGGESTIONS FOR TEACHERS ==================== */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Composer */}
          <form
            onSubmit={handleSendReport}
            className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 h-fit"
          >
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Write Feedback Summary & Suggestions for Teacher
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Once sent, this report appears directly at the bottom of the selected Usthad’s Faculty Portal.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Recipient Teacher / Faculty *
              </label>
              <select
                value={reportTeacherId}
                onChange={(e) => setReportTeacherId(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-700"
                required
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} — {t.specialization || 'Tahfeezul Quran Faculty'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Summarized Feedback Report *
              </label>
              <textarea
                rows={4}
                value={summaryText}
                onChange={(e) => setSummaryText(e.target.value)}
                placeholder="Summarize key strengths and student feedback trends observed this semester..."
                className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-700"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mudir Suggestions & Action Plan
              </label>
              <textarea
                rows={4}
                value={suggestionsText}
                onChange={(e) => setSuggestionsText(e.target.value)}
                placeholder="Write constructive recommendations, Tajweed focus points, or classroom pacing suggestions..."
                className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-700"
              />
            </div>

            <button
              type="submit"
              disabled={isSendingReport}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSendingReport ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Send Feedback Report to Teacher Portal</span>
            </button>
          </form>

          {/* Sent Reports History */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">
                Dispatched Mudir Reports ({reports.length})
              </h2>
              <span className="text-[11px] text-slate-400">Visible in Faculty Portal</span>
            </div>

            {reports.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No feedback summary reports have been sent to teachers yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
                {reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900">{rep.teacherName}</div>
                        <div className="text-[11px] text-emerald-800">
                          {rep.facultyLabel || 'Tahfeezul Quran Faculty'} · {rep.term}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {new Date(rep.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="pt-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Summary Report
                      </div>
                      <p className="text-slate-700 leading-relaxed mt-0.5">{rep.summaryText}</p>
                    </div>

                    {rep.suggestionsText && (
                      <div className="pt-1 border-t border-slate-200/70">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                          Suggestions from Mudir
                        </div>
                        <p className="text-slate-700 leading-relaxed mt-0.5">
                          {rep.suggestionsText}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
