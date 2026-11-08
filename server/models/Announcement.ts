import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnouncement extends Document {
  id: string;
  title: string;
  content: string;
  date: string;
  category: 'Academic' | 'Attendance' | 'Exam' | 'General';
  author: string;
  isImportant?: boolean;
  imageUrl?: string;
  imagePublicId?: string;
  targetRole?: 'ALL' | 'STUDENTS' | 'TEACHERS' | 'PARENTS';
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    date: { type: String, required: true, index: true },
    category: {
      type: String,
      enum: ['Academic', 'Attendance', 'Exam', 'General'],
      default: 'General',
      index: true,
    },
    author: { type: String, default: 'Mudir Office' },
    isImportant: { type: Boolean, default: false },
    imageUrl: { type: String },
    imagePublicId: { type: String },
    targetRole: { type: String, enum: ['ALL', 'STUDENTS', 'TEACHERS', 'PARENTS'], default: 'ALL' },
  },
  {
    timestamps: true,
  }
);

AnnouncementSchema.index({ date: -1, isImportant: -1 });

export const Announcement = mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);
