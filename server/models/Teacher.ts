import mongoose, { Schema, Document } from 'mongoose';

export interface ITeacher extends Document {
  id: string;
  teacherId: string;
  fullName: string;
  arabicTitle: string;
  photo: string;
  photoPublicId?: string;
  phone: string;
  email: string;
  qualification: string;
  experienceYears: number;
  assignedCampusId: string;
  assignedClassIds: string[];
  accountStatus: 'Active' | 'On Leave';
  specialization: string;
  createdAt: Date;
  updatedAt: Date;
}

const TeacherSchema = new Schema<ITeacher>(
  {
    id: { type: String, required: true, unique: true, index: true },
    teacherId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true, index: true },
    arabicTitle: { type: String, default: '' },
    photo: { type: String, default: '' },
    photoPublicId: { type: String },
    phone: { type: String, default: '' },
    email: { type: String, required: true, unique: true, index: true },
    qualification: { type: String, default: 'Hafiz & Qari' },
    experienceYears: { type: Number, default: 0 },
    assignedCampusId: { type: String, default: 'campus-main', index: true },
    assignedClassIds: [{ type: String }],
    accountStatus: { type: String, enum: ['Active', 'On Leave'], default: 'Active', index: true },
    specialization: { type: String, default: 'Hifz & Tajweed' },
  },
  {
    timestamps: true,
  }
);

export const Teacher = mongoose.model<ITeacher>('Teacher', TeacherSchema);
