import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest, authorize, logAuditEvent } from '../middleware/auth';
import {
  buildDefaultFeedbackConfig,
  getRuntimeDb,
  isMongoReady,
  saveRuntimeDb,
} from '../config/runtimeStore';
import {
  FeedbackConfigModel,
  FeedbackSubmissionModel,
  TeacherFeedbackReportModel,
} from '../models/FeedbackModels';
import { Student } from '../models/Student';
import { Teacher } from '../models/Teacher';
import { ClassBatch } from '../models/ClassBatch';
import {
  emitFeedbackConfigUpdated,
  emitFeedbackReportUpdated,
  emitFeedbackSubmitted,
} from '../socket';

const router = Router();

const questionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(2, 'Question text is required'),
  arabicPrompt: z.string().optional().default(''),
  type: z.enum(['RATING_5', 'MULTIPLE_CHOICE', 'YES_NO', 'TEXT']).default('RATING_5'),
  required: z.boolean().default(true),
  options: z.array(z.string()).optional().default([]),
  isActive: z.boolean().default(true),
  order: z.coerce.number().default(1),
});

const configUpdateSchema = z.object({
  isEnabled: z.boolean(),
  term: z.string().min(2).default('2026-27 (Odd Semester)'),
  description: z.string().optional().default(''),
  questions: z.array(questionSchema).default([]),
});

const submitSchema = z.object({
  teacherId: z.string().min(1, 'Teacher selection is required'),
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      value: z.union([z.string(), z.number(), z.boolean()]),
    })
  ),
});

const reportSchema = z.object({
  teacherId: z.string().min(1, 'Teacher is required'),
  facultyLabel: z.string().optional(),
  term: z.string().optional(),
  summaryText: z.string().min(3, 'Summary report text is required'),
  suggestionsText: z.string().optional().default(''),
});

async function getOrCreateCampusConfig(campusId: string) {
  if (!isMongoReady()) {
    const db = getRuntimeDb();
    let cfg = db.feedbackConfigs.find((c) => c.campusId === campusId);
    if (!cfg) {
      cfg = buildDefaultFeedbackConfig(campusId);
      db.feedbackConfigs.push(cfg);
      saveRuntimeDb(db);
    }
    return cfg;
  }

  let cfg = await FeedbackConfigModel.findOne({ campusId }).lean();
  if (!cfg) {
    const def = buildDefaultFeedbackConfig(campusId);
    const created = await FeedbackConfigModel.create(def);
    cfg = created.toObject();
  }
  return cfg;
}

// GET /api/feedback/config - Campus feedback settings & questions
router.get('/config', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const campusId = (req.query.campusId as string) || user.campusId || 'campus-main';
    const cfg = await getOrCreateCampusConfig(campusId);

    const sortedQuestions = [...(cfg.questions || [])].sort(
      (a: any, b: any) => Number(a.order || 0) - Number(b.order || 0)
    );

    if (user.role === 'STUDENT' || user.role === 'PARENT') {
      return res.json({
        success: true,
        data: {
          campusId: cfg.campusId,
          isEnabled: Boolean(cfg.isEnabled),
          term: cfg.term,
          description: cfg.description || '',
          questions: cfg.isEnabled ? sortedQuestions.filter((q: any) => q.isActive !== false) : [],
          updatedAt: cfg.updatedAt,
        },
      });
    }

    return res.json({
      success: true,
      data: {
        campusId: cfg.campusId,
        isEnabled: Boolean(cfg.isEnabled),
        term: cfg.term,
        description: cfg.description || '',
        questions: sortedQuestions,
        updatedAt: cfg.updatedAt,
        updatedBy: cfg.updatedBy,
      },
    });
  } catch (err: any) {
    console.error('[Feedback] Config fetch error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load feedback configuration' });
  }
});

// PUT /api/feedback/config - Mudir updates toggle, term, and questions
router.put('/config', authenticate, authorize('MUDEER'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const parse = configUpdateSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Invalid feedback configuration',
      });
    }

    const campusId = user.campusId || 'campus-main';
    const payload = parse.data;
    const normalizedQuestions = payload.questions.map((q, idx) => ({
      ...q,
      order: idx + 1,
      options:
        q.type === 'YES_NO'
          ? ['Yes', 'No']
          : q.type === 'MULTIPLE_CHOICE'
            ? (q.options || []).map((o) => o.trim()).filter(Boolean)
            : [],
    }));

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      const idx = db.feedbackConfigs.findIndex((c) => c.campusId === campusId);
      const updated = {
        campusId,
        isEnabled: payload.isEnabled,
        term: payload.term,
        description: payload.description || '',
        questions: normalizedQuestions,
        updatedAt: new Date().toISOString(),
        updatedBy: user.fullName,
      };
      if (idx >= 0) {
        db.feedbackConfigs[idx] = updated;
      } else {
        db.feedbackConfigs.push(updated);
      }
      saveRuntimeDb(db);
      emitFeedbackConfigUpdated(updated);
      return res.json({ success: true, data: updated });
    }

    const updated = await FeedbackConfigModel.findOneAndUpdate(
      { campusId },
      {
        $set: {
          campusId,
          isEnabled: payload.isEnabled,
          term: payload.term,
          description: payload.description || '',
          questions: normalizedQuestions,
          updatedBy: user.fullName,
        },
      },
      { upsert: true, new: true }
    ).lean();

    await logAuditEvent('FEEDBACK_CONFIG_UPDATE', user, 'FeedbackConfig', campusId, {
      isEnabled: payload.isEnabled,
      questionCount: normalizedQuestions.length,
    });

    emitFeedbackConfigUpdated(updated);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('[Feedback] Config update error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update feedback settings' });
  }
});

// GET /api/feedback/my-status - Student checks pending teachers & questions
router.get('/my-status', authenticate, authorize('STUDENT'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const campusId = user.campusId || 'campus-main';
    const cfg = await getOrCreateCampusConfig(campusId);
    const activeQuestions = [...(cfg.questions || [])]
      .filter((q: any) => q.isActive !== false)
      .sort((a: any, b: any) => Number(a.order || 0) - Number(b.order || 0));

    if (!cfg.isEnabled) {
      return res.json({
        success: true,
        data: {
          isEnabled: false,
          term: cfg.term,
          description: cfg.description || '',
          questions: [],
          teachers: [],
          submittedTeacherIds: [],
          pendingTeachers: [],
          requiresSubmission: false,
        },
      });
    }

    let student: any = null;
    let campusTeachers: any[] = [];
    let campusClasses: any[] = [];
    let existingSubs: any[] = [];

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      student =
        db.students.find((s) => s.id === user.studentId || s.admissionNumber === user.referenceId) || null;
      const effCampusId = student?.campusId || campusId;
      campusTeachers = db.teachers.filter((t) => !effCampusId || t.assignedCampusId === effCampusId);
      campusClasses = db.classes.filter((c) => !effCampusId || c.campusId === effCampusId);
      existingSubs = db.feedbackSubmissions.filter(
        (sub) =>
          sub.campusId === effCampusId &&
          sub.studentId === (student?.id || user.studentId || user.id) &&
          sub.term === cfg.term
      );
    } else {
      student = await Student.findOne({
        $or: [{ id: user.studentId }, ...(user.referenceId ? [{ admissionNumber: user.referenceId }] : [])],
      }).lean();
      const effCampusId = student?.campusId || campusId;
      [campusTeachers, campusClasses, existingSubs] = await Promise.all([
        Teacher.find({ assignedCampusId: effCampusId }).lean(),
        ClassBatch.find({ campusId: effCampusId }).lean(),
        FeedbackSubmissionModel.find({
          campusId: effCampusId,
          studentId: student?.id || user.studentId || user.id,
          term: cfg.term,
        }).lean(),
      ]);
    }

    const studentClassId = student?.classId;
    const matchedClass = campusClasses.find((c: any) => c.id === studentClassId);

    // Prioritize teachers assigned to student's class/student, fallback to active campus teachers
    let relevantTeachers = campusTeachers.filter((t: any) => {
      const assigned = Array.isArray(t.assignedClassIds) && studentClassId && t.assignedClassIds.includes(studentClassId);
      const isDirectMentor = student?.assignedTeacherId && (t.id === student.assignedTeacherId || t.teacherId === student.assignedTeacherId);
      const isClassUsthad = matchedClass?.usthadId && (t.id === matchedClass.usthadId || t.teacherId === matchedClass.usthadId);
      return assigned || isDirectMentor || isClassUsthad;
    });

    if (relevantTeachers.length === 0) {
      relevantTeachers = campusTeachers.filter((t: any) => t.accountStatus !== 'On Leave');
    }

    const submittedSet = new Set(existingSubs.map((s: any) => s.teacherId));
    const teachersPayload = relevantTeachers.map((t: any) => ({
      id: t.id,
      teacherId: t.teacherId,
      fullName: t.fullName,
      arabicTitle: t.arabicTitle,
      photo: t.photo,
      specialization: t.specialization,
      facultyDepartment: t.specialization || 'Tahfeezul Quran Faculty',
      submitted: submittedSet.has(t.id),
    }));

    const pendingTeachers = teachersPayload
      .filter((t) => !t.submitted)
      .map((t) => ({ id: t.id, fullName: t.fullName, facultyDepartment: t.facultyDepartment }));

    return res.json({
      success: true,
      data: {
        isEnabled: true,
        term: cfg.term,
        description: cfg.description || '',
        questions: activeQuestions,
        teachers: teachersPayload,
        submittedTeacherIds: Array.from(submittedSet),
        pendingTeachers,
        requiresSubmission: activeQuestions.length > 0 && pendingTeachers.length > 0,
      },
    });
  } catch (err: any) {
    console.error('[Feedback] Student status error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load student feedback status' });
  }
});

// POST /api/feedback/submit - Student submits feedback for a teacher
router.post('/submit', authenticate, authorize('STUDENT'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const parse = submitSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Invalid feedback payload',
      });
    }

    const campusId = user.campusId || 'campus-main';
    const cfg = await getOrCreateCampusConfig(campusId);

    if (!cfg.isEnabled) {
      return res.status(403).json({
        success: false,
        error: 'Feedback collection is currently disabled by the Mudir.',
      });
    }

    const activeQuestions = [...(cfg.questions || [])].filter((q: any) => q.isActive !== false);
    const answerMap = new Map(parse.data.answers.map((a) => [a.questionId, a.value]));

    for (const q of activeQuestions) {
      const val = answerMap.get(q.id);
      const isEmpty =
        val === undefined ||
        val === null ||
        (typeof val === 'string' && val.trim() === '') ||
        (q.type === 'RATING_5' && Number(val) < 1);
      if (q.required && isEmpty) {
        return res.status(400).json({
          success: false,
          error: `Please answer required question: "${q.prompt}"`,
        });
      }
    }

    let student: any = null;
    let teacher: any = null;
    let batchName = 'Hifz Batch A';

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      student = db.students.find((s) => s.id === user.studentId || s.admissionNumber === user.referenceId);
      teacher = db.teachers.find((t) => t.id === parse.data.teacherId || t.teacherId === parse.data.teacherId);
      const cls = db.classes.find((c) => c.id === (student?.classId || 'batch-a'));
      if (cls) batchName = cls.name;
    } else {
      student = await Student.findOne({ id: user.studentId }).lean();
      teacher = await Teacher.findOne({
        $or: [{ id: parse.data.teacherId }, { teacherId: parse.data.teacherId }],
      }).lean();
      const cls = await ClassBatch.findOne({ id: student?.classId || 'batch-a' }).lean();
      if (cls) batchName = cls.name;
    }

    const resolvedStudentId = student?.id || user.studentId || user.id;
    const resolvedTeacherId = teacher?.id || parse.data.teacherId;
    const resolvedTeacherName = teacher?.fullName || 'Faculty Mentor';
    const facultyDepartment = teacher?.specialization || batchName || 'Tahfeezul Quran Faculty';

    const formattedAnswers = activeQuestions
      .map((q: any) => {
        const val = answerMap.get(q.id);
        if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
          return null;
        }
        return {
          questionId: q.id,
          questionPrompt: q.prompt,
          type: q.type,
          value: q.type === 'RATING_5' ? Number(val) : val,
        };
      })
      .filter(Boolean);

    const submissionRecord = {
      id: `fbsub_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      campusId,
      studentId: resolvedStudentId,
      studentName: student?.fullName || user.fullName,
      admissionNumber: student?.admissionNumber || user.referenceId || '',
      classId: student?.classId || 'batch-a',
      batchName,
      teacherId: resolvedTeacherId,
      teacherName: resolvedTeacherName,
      facultyDepartment,
      term: cfg.term,
      answers: formattedAnswers,
      submittedAt: new Date().toISOString(),
    };

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      const existingIdx = db.feedbackSubmissions.findIndex(
        (s) =>
          s.campusId === campusId &&
          s.studentId === resolvedStudentId &&
          s.teacherId === resolvedTeacherId &&
          s.term === cfg.term
      );
      if (existingIdx >= 0) {
        submissionRecord.id = db.feedbackSubmissions[existingIdx].id;
        db.feedbackSubmissions[existingIdx] = submissionRecord;
      } else {
        db.feedbackSubmissions.unshift(submissionRecord);
      }
      saveRuntimeDb(db);
      emitFeedbackSubmitted(submissionRecord);
      return res.status(201).json({ success: true, data: submissionRecord });
    }

    const saved = await FeedbackSubmissionModel.findOneAndUpdate(
      { campusId, studentId: resolvedStudentId, teacherId: resolvedTeacherId, term: cfg.term },
      { $set: submissionRecord },
      { upsert: true, new: true }
    ).lean();

    emitFeedbackSubmitted(saved);
    return res.status(201).json({ success: true, data: saved });
  } catch (err: any) {
    console.error('[Feedback] Submit error:', err);
    return res.status(500).json({ success: false, error: 'Failed to submit feedback' });
  }
});

// GET /api/feedback/submissions - Mudir reviews submissions faculty-wise and teacher-wise
router.get('/submissions', authenticate, authorize('MUDEER'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const campusId = user.campusId || 'campus-main';

    const submissions = !isMongoReady()
      ? getRuntimeDb().feedbackSubmissions
          .filter((s) => s.campusId === campusId)
          .sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)))
      : await FeedbackSubmissionModel.find({ campusId }).sort({ submittedAt: -1 }).lean();

    return res.json({ success: true, data: submissions });
  } catch (err: any) {
    console.error('[Feedback] Submissions fetch error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load feedback submissions' });
  }
});

// GET /api/feedback/reports - Mudir sees all campus reports; Usthad sees reports sent to them
router.get('/reports', authenticate, authorize('MUDEER', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const campusId = user.campusId || 'campus-main';
    const { teacherId } = req.query;

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      let reports = db.teacherFeedbackReports.filter((r) => r.campusId === campusId);
      if (user.role === 'USTHAD') {
        reports = reports.filter(
          (r) => r.teacherId === user.id || (user.referenceId && r.teacherId === user.referenceId)
        );
      } else if (teacherId) {
        reports = reports.filter((r) => r.teacherId === String(teacherId));
      }
      reports.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      return res.json({ success: true, data: reports });
    }

    const query: any = { campusId };
    if (user.role === 'USTHAD') {
      query.$or = [{ teacherId: user.id }, ...(user.referenceId ? [{ teacherId: user.referenceId }] : [])];
    } else if (teacherId) {
      query.teacherId = String(teacherId);
    }

    const docs = await TeacherFeedbackReportModel.find(query).sort({ createdAtIso: -1 }).lean();
    const mapped = docs.map((d: any) => ({
      ...d,
      createdAt: d.createdAtIso || d.createdAt,
    }));
    return res.json({ success: true, data: mapped });
  } catch (err: any) {
    console.error('[Feedback] Reports fetch error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load feedback reports' });
  }
});

// POST /api/feedback/reports - Mudir writes and sends summarized report & suggestions to a teacher
router.post('/reports', authenticate, authorize('MUDEER'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const parse = reportSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Invalid report payload',
      });
    }

    const campusId = user.campusId || 'campus-main';
    const cfg = await getOrCreateCampusConfig(campusId);
    let teacher: any = null;

    if (!isMongoReady()) {
      teacher = getRuntimeDb().teachers.find(
        (t) => t.id === parse.data.teacherId || t.teacherId === parse.data.teacherId
      );
    } else {
      teacher = await Teacher.findOne({
        $or: [{ id: parse.data.teacherId }, { teacherId: parse.data.teacherId }],
      }).lean();
    }

    const now = new Date().toISOString();
    const report = {
      id: `fbrep_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      campusId,
      teacherId: teacher?.id || parse.data.teacherId,
      teacherName: teacher?.fullName || 'Faculty Usthad',
      facultyLabel: parse.data.facultyLabel || teacher?.specialization || 'Tahfeezul Quran Faculty',
      term: parse.data.term || cfg.term || '2026-27 (Odd Semester)',
      summaryText: parse.data.summaryText.trim(),
      suggestionsText: (parse.data.suggestionsText || '').trim(),
      mudirName: user.fullName,
      createdAt: now,
      updatedAt: now,
    };

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      db.teacherFeedbackReports.unshift(report);
      saveRuntimeDb(db);
      emitFeedbackReportUpdated(report);
      return res.status(201).json({ success: true, data: report });
    }

    await TeacherFeedbackReportModel.create({
      ...report,
      createdAtIso: now,
    });

    await logAuditEvent('FEEDBACK_REPORT_SEND', user, 'TeacherFeedbackReport', report.id, {
      teacherId: report.teacherId,
      teacherName: report.teacherName,
    });

    emitFeedbackReportUpdated(report);
    return res.status(201).json({ success: true, data: report });
  } catch (err: any) {
    console.error('[Feedback] Report save error:', err);
    return res.status(500).json({ success: false, error: 'Failed to send feedback report to teacher' });
  }
});

export default router;
