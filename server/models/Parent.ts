import mongoose, { Schema, Document } from 'mongoose';

export interface IParent extends Document {
  id: string;
  fullName: string;
  arabicName?: string;
  phone: string;
  email: string;
  photo?: string;
  photoPublicId?: string;
  relationship: string;
  linkedStudentIds: string[];
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ParentSchema = new Schema<IParent>(
  {
    id: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    arabicName: { type: String },
    phone: { type: String, required: true, index: true },
    email: { type: String, required: true, index: true },
    photo: { type: String },
    photoPublicId: { type: String },
    relationship: { type: String, default: 'Father' },
    linkedStudentIds: [{ type: String, index: true }],
    address: { type: String },
  },
  {
    timestamps: true,
  }
);

export const Parent = mongoose.model<IParent>('Parent', ParentSchema);
