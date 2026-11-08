import mongoose, { Schema, Document } from 'mongoose';

export interface IStudent extends Document {
  id: string;
  rollNumber: number;
  admissionNumber: string;
  fullName: string;
  arabicName: string;
  photo: string;
  photoPublicId?: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female';
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  admissionDate: string;
  campusId: string;
  classId: string;
  assignedTeacherId: string;
  accountStatus: 'Active' | 'On Leave' | 'Completed';
  currentJuz: number;
  completedJuzList: number[];
  totalMemorizedAyahs: number;
  attendanceRate: number;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    id: { type: String, required: true, unique: true, index: true },
    rollNumber: { type: Number, required: true, index: true },
    admissionNumber: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true, index: true },
    arabicName: { type: String, default: '' },
    photo: { type: String, default: '' },
    photoPublicId: { type: String },
    dateOfBirth: { type: String, default: '' },
    gender: { type: String, enum: ['Male', 'Female'], default: 'Male' },
    parentName: { type: String, default: '' },
    parentPhone: { type: String, default: '' },
    parentEmail: { type: String, default: '' },
    admissionDate: { type: String, default: '' },
    campusId: { type: String, default: 'campus-main', index: true },
    classId: { type: String, required: true, index: true },
    assignedTeacherId: { type: String, required: true, index: true },
    accountStatus: {
      type: String,
      enum: ['Active', 'On Leave', 'Completed'],
      default: 'Active',
      index: true,
    },
    currentJuz: { type: Number, default: 1, min: 1, max: 30 },
    completedJuzList: [{ type: Number }],
    totalMemorizedAyahs: { type: Number, default: 0 },
    attendanceRate: { type: Number, default: 95 },
  },
  {
    timestamps: true,
  }
);

// Compound index for class + rollNumber
StudentSchema.index({ classId: 1, rollNumber: 1 });
StudentSchema.index({ classId: 1, accountStatus: 1 });

export const Student = mongoose.model<IStudent>('Student', StudentSchema);
