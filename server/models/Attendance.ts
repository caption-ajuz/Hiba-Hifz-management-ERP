import mongoose, { Schema, Document } from 'mongoose';

export type AttendanceStatusType = 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_MARKED';

export interface IAttendanceItem extends Document {
  studentId: string;
  classId: string;
  date: string; // YYYY-MM-DD
  sessionHour: number; // 1 to 5
  status: AttendanceStatusType;
  markedByUsthadId: string;
  note?: string;
  academicYear: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceItemSchema = new Schema<IAttendanceItem>(
  {
    studentId: { type: String, required: true, index: true },
    classId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    sessionHour: { type: Number, required: true, min: 1, max: 5 },
    status: {
      type: String,
      enum: ['PRESENT', 'ABSENT', 'LATE', 'NOT_MARKED'],
      default: 'NOT_MARKED',
      required: true,
    },
    markedByUsthadId: { type: String, required: true, index: true },
    note: { type: String, default: '' },
    academicYear: { type: String, default: '2025-2026', index: true },
  },
  {
    timestamps: true,
  }
);

// CRITICAL UNIQUE COMPOUND INDEX to prevent duplicate attendance records for the same student, date and session:
AttendanceItemSchema.index(
  { studentId: 1, date: 1, sessionHour: 1 },
  { unique: true }
);

// Query optimization index for class date queries
AttendanceItemSchema.index({ classId: 1, date: 1, sessionHour: 1 });

export const AttendanceItem = mongoose.model<IAttendanceItem>('AttendanceItem', AttendanceItemSchema);

// Attendance Session Model to track full daily session submissions
export interface IAttendanceSessionDoc extends Document {
  id: string;
  classId: string;
  date: string;
  sessionHour: number;
  sessionName: string;
  usthadId: string;
  academicYear: string;
  topic?: string;
  description?: string;
  records: Record<string, AttendanceStatusType>;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSessionSchema = new Schema<IAttendanceSessionDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    classId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    sessionHour: { type: Number, required: true, min: 1, max: 5 },
    sessionName: { type: String, required: true },
    usthadId: { type: String, required: true, index: true },
    academicYear: { type: String, default: '2025-2026', index: true },
    topic: { type: String },
    description: { type: String },
    records: { type: Map, of: String, default: {} },
    submittedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

AttendanceSessionSchema.index({ classId: 1, date: 1, sessionHour: 1 }, { unique: true });

export const AttendanceSessionModel = mongoose.model<IAttendanceSessionDoc>(
  'AttendanceSession',
  AttendanceSessionSchema
);
