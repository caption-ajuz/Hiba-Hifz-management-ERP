import mongoose, { Schema, Document } from 'mongoose';

export interface ICollegeEvent extends Document {
  id: string;
  title: string;
  arabicTitle?: string;
  description: string;
  category: 'Academic' | 'Competition' | 'Ceremony' | 'Exam' | 'Holiday' | 'Majlis' | 'Parent-Teacher Meeting' | 'General';
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  venue: string;
  campusId?: string;
  targetAudience: 'ALL' | 'STUDENTS' | 'PARENTS' | 'TEACHERS';
  status: 'Scheduled' | 'Ongoing' | 'Completed' | 'Postponed';
  createdBy?: string;
  creatorRole?: string;
  isImportant?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CollegeEventSchema = new Schema<ICollegeEvent>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    arabicTitle: { type: String, trim: true },
    description: { type: String, default: '' },
    category: {
      type: String,
      enum: ['Academic', 'Competition', 'Ceremony', 'Exam', 'Holiday', 'Majlis', 'Parent-Teacher Meeting', 'General'],
      default: 'General',
      index: true,
    },
    startDate: { type: String, required: true, index: true },
    endDate: { type: String },
    startTime: { type: String, default: '09:00 AM' },
    endTime: { type: String, default: '12:00 PM' },
    venue: { type: String, default: 'Markazul Hidayathil Islamiyya Main Campus' },
    campusId: { type: String, default: 'campus-main' },
    targetAudience: {
      type: String,
      enum: ['ALL', 'STUDENTS', 'PARENTS', 'TEACHERS'],
      default: 'ALL',
      index: true,
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Ongoing', 'Completed', 'Postponed'],
      default: 'Scheduled',
      index: true,
    },
    createdBy: { type: String, default: 'Mudir Office' },
    creatorRole: { type: String, default: 'SUPER_ADMIN' },
    isImportant: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const CollegeEvent = mongoose.model<ICollegeEvent>('CollegeEvent', CollegeEventSchema);
