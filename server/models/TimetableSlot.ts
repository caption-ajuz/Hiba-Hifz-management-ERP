import mongoose, { Schema, Document } from 'mongoose';

export interface ITimetableSlot extends Document {
  id: string;
  day: string; // 'D1' | 'D2' | 'D3' | 'D4' | 'D5'
  slotNumber: number;
  time: string; // '07:00 - 08:30'
  title: string;
  batch: string;
  room: string;
  mentor: string;
  color?: string;
  tag?: string;
  classId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TimetableSlotSchema = new Schema<ITimetableSlot>(
  {
    id: { type: String, required: true, unique: true, index: true },
    day: { type: String, required: true, index: true },
    slotNumber: { type: Number, required: true, index: true },
    time: { type: String, required: true },
    title: { type: String, required: true },
    batch: { type: String, default: 'Hifz Batch A' },
    room: { type: String, default: 'Tahfeez Hall 101' },
    mentor: { type: String, default: 'Usthad Mohammed Ajash T.' },
    color: { type: String, default: 'bg-emerald-50 border-emerald-200 text-emerald-950' },
    tag: { type: String, default: 'Sabq Focus' },
    classId: { type: String, default: 'batch-a' },
  },
  { timestamps: true }
);

export const TimetableSlot = mongoose.model<ITimetableSlot>('TimetableSlot', TimetableSlotSchema);
