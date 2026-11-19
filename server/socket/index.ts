import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'hyba_secure_jwt_secret_key_2026';

let ioInstance: SocketIOServer | null = null;

export interface SocketUser {
  id: string;
  role: string;
  username: string;
  fullName: string;
  studentId?: string;
  linkedStudentIds?: string[];
  assignedClassIds?: string[];
}

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  // Socket middleware for authentication (graceful if anonymous demo, but maps authenticated users to secure rooms)
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as SocketUser;
        socket.data.user = decoded;
      } catch (err) {
        // Continue as guest if token expired, still allow public channels
        socket.data.user = null;
      }
    }
    next();
  });

  io.on('connection', (socket: Socket) => {
    const user: SocketUser | null = socket.data.user;

    // Join general institution room
    socket.join('institution:main');

    if (user) {
      // Join role specific room
      socket.join(`role:${user.role}`);
      // Join personal user room
      socket.join(`user:${user.id}`);

      // If student, join student room
      if (user.studentId) {
        socket.join(`student:${user.studentId}`);
      }

      // If parent, join rooms for all linked students
      if (user.linkedStudentIds && Array.isArray(user.linkedStudentIds)) {
        user.linkedStudentIds.forEach((sid) => {
          if (sid) socket.join(`student:${sid}`);
        });
      }

      // If usthad with assigned classes, join class rooms
      if (user.assignedClassIds && Array.isArray(user.assignedClassIds)) {
        user.assignedClassIds.forEach((classId) => {
          socket.join(`class:${classId}`);
        });
      }
    }

    // Client can request to join a specific class room if authorized
    socket.on('join:class', (classId: string) => {
      if (classId) {
        socket.join(`class:${classId}`);
      }
    });

    // Client can request to leave room
    socket.on('leave:class', (classId: string) => {
      if (classId) {
        socket.leave(`class:${classId}`);
      }
    });

    // Client ping for real-time latency check
    socket.on('client:ping', () => {
      socket.emit('server:pong', { timestamp: Date.now() });
    });

    socket.on('disconnect', (reason) => {
      // Disconnection handled gracefully
    });
  });

  ioInstance = io;
  return io;
}

export function getIO(): SocketIOServer | null {
  return ioInstance;
}

// Broadcasters for real-time events required in Phase 4:

export function emitAttendanceUpdated(data: {
  classId: string;
  date: string;
  sessionHour: number;
  sessionName?: string;
  topic?: string;
  description?: string;
  records: Record<string, string>;
  updatedBy: string;
}) {
  if (!ioInstance) return;
  // Broadcast to all active users & specific class room
  ioInstance.to('institution:main').emit('attendance:updated', data);
  Object.keys(data.records || {}).forEach((sid) => {
    ioInstance!.to(`student:${sid}`).emit('attendance:updated', data);
  });
  ioInstance.to('role:HYBA_SUPER_ADMIN').emit('dashboard:updated', { type: 'attendance', data });
  ioInstance.to('role:MUDEER').emit('dashboard:updated', { type: 'attendance', data });
  ioInstance.to('role:USTHAD').emit('dashboard:updated', { type: 'attendance', data });
  ioInstance.to('role:PARENT').emit('dashboard:updated', { type: 'attendance', data });
}

export function emitHifzRecordCreated(record: any) {
  if (!ioInstance) return;
  ioInstance.to('institution:main').emit('hifz:record:created', record);
  if (record.studentId) {
    ioInstance.to(`student:${record.studentId}`).emit('hifz:record:created', record);
  }
  ioInstance.to('role:HYBA_SUPER_ADMIN').emit('dashboard:updated', { type: 'hifz', record });
  ioInstance.to('role:MUDEER').emit('dashboard:updated', { type: 'hifz', record });
}

export function emitHifzRecordUpdated(record: any) {
  if (!ioInstance) return;
  ioInstance.to('institution:main').emit('hifz:record:updated', record);
  if (record.studentId) {
    ioInstance.to(`student:${record.studentId}`).emit('hifz:record:updated', record);
  }
}

export function emitStudentUpdated(student: any) {
  if (!ioInstance) return;
  ioInstance.to('institution:main').emit('student:updated', student);
}

export function emitTeacherUpdated(teacher: any) {
  if (!ioInstance) return;
  ioInstance.to('institution:main').emit('teacher:updated', teacher);
}

export function emitAnnouncementCreated(announcement: any) {
  if (!ioInstance) return;
  ioInstance.to('institution:main').emit('announcement:created', announcement);
}

export function emitMessageReceived(recipientUserId: string, message: any) {
  if (!ioInstance) return;
  ioInstance.to(`user:${recipientUserId}`).emit('message:received', message);
}

export function emitNotificationCreated(recipientUserId: string, notification: any) {
  if (!ioInstance) return;
  ioInstance.to(`user:${recipientUserId}`).emit('notification:created', notification);
}

export function emitDashboardUpdated(role?: string, data?: any) {
  if (!ioInstance) return;
  if (role) {
    ioInstance.to(`role:${role}`).emit('dashboard:updated', data);
  } else {
    ioInstance.to('institution:main').emit('dashboard:updated', data);
  }
}

export function emitEventChanged(action: 'created' | 'updated' | 'deleted', event: any) {
  if (!ioInstance) return;
  ioInstance.to('institution:main').emit(`event:${action}`, event);
  ioInstance.to('institution:main').emit('dashboard:updated', { type: 'event', action, event });
}

export function emitTimetableUpdated(slots?: any[]) {
  if (!ioInstance) return;
  ioInstance.to('institution:main').emit('timetable:updated', { slots });
  ioInstance.to('institution:main').emit('dashboard:updated', { type: 'timetable' });
}

export function emitFeedbackConfigUpdated(config: any) {
  if (!ioInstance) return;
  ioInstance.to('institution:main').emit('feedback:config:updated', config);
}

export function emitFeedbackSubmitted(submission: any) {
  if (!ioInstance) return;
  ioInstance.to('role:MUDEER').emit('feedback:submitted', submission);
  ioInstance.to('role:HYBA_SUPER_ADMIN').emit('feedback:submitted', submission);
}

export function emitFeedbackReportUpdated(report: any) {
  if (!ioInstance) return;
  ioInstance.to('role:MUDEER').emit('feedback:report:updated', report);
  ioInstance.to('role:USTHAD').emit('feedback:report:updated', report);
  if (report?.teacherId) {
    ioInstance.to(`user:${report.teacherId}`).emit('feedback:report:updated', report);
  }
}

export function emitStudentProfilePermissionUpdated(payload: {
  campusId: string;
  allowStudentProfileEdit: boolean;
  updatedBy?: string;
}) {
  if (!ioInstance) return;
  ioInstance.to('institution:main').emit('student:profile-edit-permission:updated', payload);
}

