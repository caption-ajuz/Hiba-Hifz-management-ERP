import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IWebAuthnCredential {
  credentialID: string;
  publicKey: string;
  counter: number;
  transports?: string[];
  deviceName?: string;
  authenticatorType?: string;
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface IUser extends Document {
  id: string; // custom/external id matching frontend
  role: 'HYBA_SUPER_ADMIN' | 'MUDEER' | 'USTHAD' | 'STUDENT' | 'PARENT';
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
  campusId?: string;
  studentId?: string;
  linkedStudentIds?: string[];
  assignedClassIds?: string[];
  mustChangePassword?: boolean;
  isActive: boolean;
  lastLoginAt?: Date;
  webauthnCredentials?: IWebAuthnCredential[];
  comparePassword(candidate: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const WebAuthnCredentialSchema = new Schema<IWebAuthnCredential>(
  {
    credentialID: { type: String, required: true },
    publicKey: { type: String, required: true },
    counter: { type: Number, required: true, default: 0 },
    transports: [{ type: String }],
    deviceName: { type: String, default: 'Trusted Biometric Device' },
    authenticatorType: { type: String, default: 'platform' },
    createdAt: { type: Date, default: Date.now },
    lastUsedAt: { type: Date },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    id: { type: String, required: true, unique: true, index: true },
    role: {
      type: String,
      enum: ['HYBA_SUPER_ADMIN', 'MUDEER', 'USTHAD', 'STUDENT', 'PARENT'],
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
    campusId: { type: String, index: true },
    studentId: { type: String, index: true },
    linkedStudentIds: [{ type: String }],
    assignedClassIds: [{ type: String }],
    mustChangePassword: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    webauthnCredentials: { type: [WebAuthnCredentialSchema], default: [] },
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
