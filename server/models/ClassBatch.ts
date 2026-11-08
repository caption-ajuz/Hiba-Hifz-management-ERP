import mongoose, { Schema, Document } from 'mongoose';

export interface IClassBatch extends Document {
  id: string;
  name: string;
  arabicName: string;
  campusId: string;
  usthadId: string;
  roomNumber: string;
  academicYear: string;
  capacity: number;
  totalStudents: number;
  createdAt: Date;
  updatedAt: Date;
}

const ClassBatchSchema = new Schema<IClassBatch>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    arabicName: { type: String, default: '' },
    campusId: { type: String, default: 'campus-main', index: true },
    usthadId: { type: String, required: true, index: true },
    roomNumber: { type: String, default: '' },
    academicYear: { type: String, default: '2025-2026', index: true },
    capacity: { type: Number, default: 30 },
    totalStudents: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export const ClassBatch = mongoose.model<IClassBatch>('ClassBatch', ClassBatchSchema);
