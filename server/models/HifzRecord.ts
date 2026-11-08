import mongoose, { Schema, Document } from 'mongoose';

export type HifzRecordType = 'SABQ' | 'SABQI' | 'MURAJATH' | 'MANZIL';
export type PerformanceLevel = 'Excellent' | 'Good' | 'Average' | 'Needs Improvement';
export type HifzResultStatus = 'Passed' | 'Revision Required' | 'Not Passed';

export interface IHifzRecord extends Document {
  id: string;
  studentId: string;
  teacherId: string;
  classId?: string;
  date: string;
  recordType: HifzRecordType;
  // Sabq / Sabqi / Murajath
  surahNumber?: number;
  surahName?: string;
  surahArabic?: string;
  startAyah?: number;
  endAyah?: number;
  // Manzil
  juzNumber?: number;
  juzName?: string;
  surahRangeText?: string;
  // Evaluation
  performance: PerformanceLevel;
  mistakeCount: number;
  status: HifzResultStatus;
  teacherRemarks: string;
  nextLessonConfirmed?: boolean;
  nextLessonPosition?: string;
  academicYear: string;
  createdAt: Date;
  updatedAt: Date;
}

const HifzRecordSchema = new Schema<IHifzRecord>(
  {
    id: { type: String, required: true, unique: true, index: true },
    studentId: { type: String, required: true, index: true },
    teacherId: { type: String, required: true, index: true },
    classId: { type: String, index: true },
    date: { type: String, required: true, index: true },
    recordType: {
      type: String,
      enum: ['SABQ', 'SABQI', 'MURAJATH', 'MANZIL'],
      required: true,
      index: true,
    },
    surahNumber: { type: Number },
    surahName: { type: String },
    surahArabic: { type: String },
    startAyah: { type: Number },
    endAyah: { type: Number },
    juzNumber: { type: Number, index: true },
    juzName: { type: String },
    surahRangeText: { type: String },
    performance: {
      type: String,
      enum: ['Excellent', 'Good', 'Average', 'Needs Improvement'],
      default: 'Good',
    },
    mistakeCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Passed', 'Revision Required', 'Not Passed'],
      default: 'Passed',
    },
    teacherRemarks: { type: String, default: '' },
    nextLessonConfirmed: { type: Boolean, default: false },
    nextLessonPosition: { type: String },
    academicYear: { type: String, default: '2025-2026', index: true },
  },
  {
    timestamps: true,
  }
);

// High performance query index
HifzRecordSchema.index({ studentId: 1, date: -1 });
HifzRecordSchema.index({ studentId: 1, recordType: 1, date: -1 });
HifzRecordSchema.index({ teacherId: 1, date: -1 });

export const HifzRecord = mongoose.model<IHifzRecord>('HifzRecord', HifzRecordSchema);
