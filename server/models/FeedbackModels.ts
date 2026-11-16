import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedbackQuestionItem {
  id: string;
  prompt: string;
  arabicPrompt?: string;
  type: 'RATING_5' | 'MULTIPLE_CHOICE' | 'YES_NO' | 'TEXT';
  required: boolean;
  options?: string[];
  isActive: boolean;
  order: number;
}

export interface IFeedbackConfig extends Document {
  campusId: string;
  isEnabled: boolean;
  term: string;
  description?: string;
  questions: IFeedbackQuestionItem[];
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackQuestionSchema = new Schema<IFeedbackQuestionItem>(
  {
    id: { type: String, required: true },
    prompt: { type: String, required: true, trim: true },
    arabicPrompt: { type: String, default: '' },
    type: {
      type: String,
      enum: ['RATING_5', 'MULTIPLE_CHOICE', 'YES_NO', 'TEXT'],
      default: 'RATING_5',
    },
    required: { type: Boolean, default: true },
    options: [{ type: String }],
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 1 },
  },
  { _id: false }
);

const FeedbackConfigSchema = new Schema<IFeedbackConfig>(
  {
    campusId: { type: String, required: true, unique: true, index: true },
    isEnabled: { type: Boolean, default: true },
    term: { type: String, default: '2026-27 (Odd Semester)' },
    description: {
      type: String,
      default: 'Confidential student evaluation of faculty mentorship, Tajweed guidance, and classroom punctuality.',
    },
    questions: { type: [FeedbackQuestionSchema], default: [] },
    updatedBy: { type: String, default: 'Mudir Office' },
  },
  { timestamps: true }
);

export const FeedbackConfigModel = mongoose.model<IFeedbackConfig>('FeedbackConfig', FeedbackConfigSchema);

export interface IFeedbackAnswer {
  questionId: string;
  questionPrompt: string;
  type: 'RATING_5' | 'MULTIPLE_CHOICE' | 'YES_NO' | 'TEXT';
  value: Schema.Types.Mixed;
}

export interface IFeedbackSubmission extends Document {
  id: string;
  campusId: string;
  studentId: string;
  studentName: string;
  admissionNumber?: string;
  classId: string;
  batchName: string;
  teacherId: string;
  teacherName: string;
  facultyDepartment: string;
  term: string;
  answers: IFeedbackAnswer[];
  submittedAt: string;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSubmissionSchema = new Schema<IFeedbackSubmission>(
  {
    id: { type: String, required: true, unique: true, index: true },
    campusId: { type: String, required: true, index: true },
    studentId: { type: String, required: true, index: true },
    studentName: { type: String, required: true },
    admissionNumber: { type: String, default: '' },
    classId: { type: String, default: 'batch-a', index: true },
    batchName: { type: String, default: 'Hifz Batch A' },
    teacherId: { type: String, required: true, index: true },
    teacherName: { type: String, required: true },
    facultyDepartment: { type: String, default: 'Tahfeezul Quran Faculty', index: true },
    term: { type: String, required: true, index: true },
    answers: [
      {
        questionId: { type: String, required: true },
        questionPrompt: { type: String, required: true },
        type: { type: String, enum: ['RATING_5', 'MULTIPLE_CHOICE', 'YES_NO', 'TEXT'], required: true },
        value: { type: Schema.Types.Mixed },
      },
    ],
    submittedAt: { type: String, required: true },
  },
  { timestamps: true }
);

FeedbackSubmissionSchema.index({ campusId: 1, studentId: 1, teacherId: 1, term: 1 }, { unique: true });

export const FeedbackSubmissionModel = mongoose.model<IFeedbackSubmission>(
  'FeedbackSubmission',
  FeedbackSubmissionSchema
);

export interface ITeacherFeedbackReport extends Document {
  id: string;
  campusId: string;
  teacherId: string;
  teacherName: string;
  facultyLabel?: string;
  term: string;
  summaryText: string;
  suggestionsText: string;
  mudirName: string;
  createdAtIso: string;
  createdAt: Date;
  updatedAt: Date;
}

const TeacherFeedbackReportSchema = new Schema<ITeacherFeedbackReport>(
  {
    id: { type: String, required: true, unique: true, index: true },
    campusId: { type: String, required: true, index: true },
    teacherId: { type: String, required: true, index: true },
    teacherName: { type: String, required: true },
    facultyLabel: { type: String, default: 'Tahfeezul Quran Faculty' },
    term: { type: String, default: '2026-27 (Odd Semester)' },
    summaryText: { type: String, required: true },
    suggestionsText: { type: String, default: '' },
    mudirName: { type: String, default: 'Campus Mudeer' },
    createdAtIso: { type: String, required: true },
  },
  { timestamps: true }
);

export const TeacherFeedbackReportModel = mongoose.model<ITeacherFeedbackReport>(
  'TeacherFeedbackReport',
  TeacherFeedbackReportSchema
);
