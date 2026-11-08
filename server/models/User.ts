import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  id: string; // custom/external id matching frontend
  role: 'SUPER_ADMIN' | 'USTHAD' | 'STUDENT' | 'PARENT';
  fullName: string;
  arabicName?: string;
  username: string;
  email: string;
  password?: string;
  phone: string;
  avatar: string;
  avatarPublicId?: string;
  title?: string;
  referenceId?: string;
  studentId?: string;
  linkedStudentIds?: string[];
  assignedClassIds?: string[];
  isActive: boolean;
  lastLoginAt?: Date;
  comparePassword(candidate: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    id: { type: String, required: true, unique: true, index: true },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'USTHAD', 'STUDENT', 'PARENT'],
      required: true,
      index: true,
    },
    fullName: { type: String, required: true, trim: true },
    arabicName: { type: String, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true },
    phone: { type: String, default: '' },
    avatar: { type: String, default: '' },
    avatarPublicId: { type: String },
    title: { type: String },
    referenceId: { type: String, index: true },
    studentId: { type: String, index: true },
    linkedStudentIds: [{ type: String }],
    assignedClassIds: [{ type: String }],
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret: any) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Hash password before saving if modified
UserSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model<IUser>('User', UserSchema);
