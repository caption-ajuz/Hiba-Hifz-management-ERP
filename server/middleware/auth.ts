import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { AuditLog } from '../models/InstitutionModels';
import { isMongoReady, getRuntimeDb } from '../config/runtimeStore';

const JWT_SECRET = process.env.JWT_SECRET || 'hyba_secure_jwt_secret_key_2026';

export interface AuthUserShape {
  id: string;
  role: 'HYBA_SUPER_ADMIN' | 'MUDEER' | 'USTHAD' | 'STUDENT' | 'PARENT';
  fullName: string;
  arabicName?: string;
  username: string;
  email: string;
  phone: string;
  avatar: string;
  title?: string;
  referenceId?: string;
  campusId?: string;
  studentId?: string;
  linkedStudentIds?: string[];
  assignedClassIds?: string[];
  mustChangePassword?: boolean;
  isActive: boolean;
}

export interface AuthRequest extends Request {
  user?: IUser | AuthUserShape;
}

export function generateToken(user: Pick<AuthUserShape, 'id' | 'role' | 'username' | 'fullName' | 'campusId' | 'studentId' | 'assignedClassIds'>): string {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      username: user.username,
      fullName: user.fullName,
      campusId: user.campusId,
      studentId: user.studentId,
      assignedClassIds: user.assignedClassIds,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.headers['x-access-token']) {
      token = req.headers['x-access-token'] as string;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication token missing. Please sign in.',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };

    let user: IUser | AuthUserShape | null = null;
    if (isMongoReady()) {
      user = await User.findOne({ id: decoded.id });
    } else {
      const db = getRuntimeDb();
      const rtUser = db.users.find((u) => u.id === decoded.id);
      if (rtUser) {
        user = {
          id: rtUser.id,
          role: rtUser.role,
          fullName: rtUser.fullName,
          arabicName: rtUser.arabicName,
          username: rtUser.username,
          email: rtUser.email,
          phone: rtUser.phone,
          avatar: rtUser.avatar,
          title: rtUser.title,
          referenceId: rtUser.referenceId,
          campusId: rtUser.campusId,
          studentId: rtUser.studentId,
          linkedStudentIds: rtUser.linkedStudentIds,
          assignedClassIds: rtUser.assignedClassIds,
          mustChangePassword: Boolean(rtUser.mustChangePassword),
          isActive: rtUser.isActive,
        };
      }
    }

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User not found or account deactivated.',
      });
    }

    req.user = user;
    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session. Please sign in again.',
    });
  }
}

/**
 * Role-based access control middleware
 */
export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access forbidden for role ${req.user.role}. Required: ${roles.join(', ')}`,
      });
    }

    next();
  };
}

/**
 * Audit log helper
 */
export async function logAuditEvent(
  action: string,
  user: IUser | AuthUserShape | undefined,
  resource: string,
  targetId?: string,
  details?: Record<string, any>,
  ip?: string
) {
  if (!isMongoReady()) return;
  try {
    await AuditLog.create({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      action,
      performedByUserId: user?.id || 'SYSTEM',
      performedByRole: user?.role || 'SYSTEM',
      targetResource: resource,
      targetId,
      details,
      ipAddress: ip,
    });
  } catch (err) {
    console.error('[AuditLog] Failed to record audit log:', err);
  }
}
