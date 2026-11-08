import mongoose, { Schema, Document } from 'mongoose';

// Notification
export interface INotification extends Document {
  id: string;
  recipientUserId: string;
  title: string;
  message: string;
  type: 'ATTENDANCE' | 'HIFZ' | 'ANNOUNCEMENT' | 'SYSTEM' | 'EVALUATION';
  link?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    id: { type: String, required: true, unique: true, index: true },
    recipientUserId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['ATTENDANCE', 'HIFZ', 'ANNOUNCEMENT', 'SYSTEM', 'EVALUATION'],
      default: 'SYSTEM',
    },
    link: { type: String },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientUserId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

// Message
export interface IMessage extends Document {
  id: string;
  senderId: string;
  senderRole: string;
  recipientId: string;
  content: string;
  attachments?: Array<{ url: string; publicId: string; name: string }>;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    id: { type: String, required: true, unique: true, index: true },
    senderId: { type: String, required: true, index: true },
    senderRole: { type: String, required: true },
    recipientId: { type: String, required: true, index: true },
    content: { type: String, required: true },
    attachments: [
      {
        url: { type: String },
        publicId: { type: String },
        name: { type: String },
      },
    ],
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

MessageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);

// AuditLog
export interface IAuditLog extends Document {
  id: string;
  action: string;
  performedByUserId: string;
  performedByRole: string;
  targetResource: string;
  targetId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    id: { type: String, required: true, unique: true, index: true },
    action: { type: String, required: true, index: true },
    performedByUserId: { type: String, required: true, index: true },
    performedByRole: { type: String, required: true },
    targetResource: { type: String, required: true, index: true },
    targetId: { type: String },
    details: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

// AcademicYear & Daily Sessions
export interface IAcademicYear extends Document {
  id: string;
  code: string; // e.g. "2025-2026"
  title: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AcademicYearSchema = new Schema<IAcademicYear>(
  {
    id: { type: String, required: true, unique: true, index: true },
    code: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    isCurrent: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const AcademicYear = mongoose.model<IAcademicYear>('AcademicYear', AcademicYearSchema);

// Daily Session Definition
export interface ISessionInfo extends Document {
  hourNumber: number;
  sessionName: string;
  sessionArabicName: string;
  startTime: string;
  endTime: string;
  sessionType: 'SABQ' | 'MURAJATH' | 'MANZIL' | 'TAJWEED' | 'ISLAMIC_STUDIES';
}

const SessionInfoSchema = new Schema<ISessionInfo>({
  hourNumber: { type: Number, required: true, unique: true },
  sessionName: { type: String, required: true },
  sessionArabicName: { type: String, default: '' },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  sessionType: {
    type: String,
    enum: ['SABQ', 'MURAJATH', 'MANZIL', 'TAJWEED', 'ISLAMIC_STUDIES'],
    default: 'SABQ',
  },
});

export const SessionInfo = mongoose.model<ISessionInfo>('SessionInfo', SessionInfoSchema);

// Institution Setting
export interface IInstitutionSetting extends Document {
  key: string;
  name: string;
  arabicName: string;
  shortAddress: string;
  fullAddress: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  logoPublicId?: string;
  campusBannerUrl: string;
  campusBannerPublicId?: string;
  currentAcademicYear: string;
  settings: Record<string, any>;
  updatedAt: Date;
}

const InstitutionSettingSchema = new Schema<IInstitutionSetting>(
  {
    key: { type: String, required: true, unique: true, default: 'HYBA_MAIN' },
    name: { type: String, required: true },
    arabicName: { type: String, required: true },
    shortAddress: { type: String, required: true },
    fullAddress: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    website: { type: String },
    logoUrl: { type: String, required: true },
    logoPublicId: { type: String },
    campusBannerUrl: { type: String, required: true },
    campusBannerPublicId: { type: String },
    currentAcademicYear: { type: String, default: '2025-2026' },
    settings: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const InstitutionSetting = mongoose.model<IInstitutionSetting>(
  'InstitutionSetting',
  InstitutionSettingSchema
);

// Teacher Evaluation
export interface ITeacherEvaluationDoc extends Document {
  id: string;
  teacherId: string;
  studentId: string;
  term: string;
  date: string;
  status: 'Completed' | 'Pending';
  course: string;
  ratings?: {
    inspiringAbility: number;
    tajweedGuidance: number;
    punctuality: number;
    revisionPatience: number;
    generalFeedback: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TeacherEvaluationSchema = new Schema<ITeacherEvaluationDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    teacherId: { type: String, required: true, index: true },
    studentId: { type: String, required: true, index: true },
    term: { type: String, required: true },
    date: { type: String, required: true },
    status: { type: String, enum: ['Completed', 'Pending'], default: 'Pending' },
    course: { type: String, default: 'Hifz' },
    ratings: {
      inspiringAbility: { type: Number, default: 5 },
      tajweedGuidance: { type: Number, default: 5 },
      punctuality: { type: Number, default: 5 },
      revisionPatience: { type: Number, default: 5 },
      generalFeedback: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

export const TeacherEvaluationModel = mongoose.model<ITeacherEvaluationDoc>(
  'TeacherEvaluation',
  TeacherEvaluationSchema
);
