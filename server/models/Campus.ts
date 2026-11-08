import mongoose, { Schema, Document } from 'mongoose';

export interface ICampus extends Document {
  id: string;
  name: string;
  code: string;
  arabicName?: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  bannerUrl?: string;
  status: 'Active' | 'Inactive';
  establishedYear?: string;
  principalName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CampusSchema = new Schema<ICampus>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    arabicName: { type: String, default: '', trim: true },
    address: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    logo: { type: String, default: '' },
    bannerUrl: { type: String, default: '' },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active', index: true },
    establishedYear: { type: String, default: '1994' },
    principalName: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

export const Campus = mongoose.model<ICampus>('Campus', CampusSchema);
