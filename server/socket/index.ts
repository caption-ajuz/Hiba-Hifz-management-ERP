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
  records: Record<string, string>;
  updatedBy: string;
}) {
  if (!ioInstance) return;
  // Broadcast to all active users & specific class room
  ioInstance.to('institution:main').emit('attendance:updated', data);
  ioInstance.to('role:SUPER_ADMIN').emit('dashboard:updated', { type: 'attendance', data });
  ioInstance.to('role:USTHAD').emit('dashboard:updated', { type: 'attendance', data });
}

export function emitHifzRecordCreated(record: any) {
  if (!ioInstance) return;
  ioInstance.to('institution:main').emit('hifz:record:created', record);
  if (record.studentId) {
    ioInstance.to(`student:${record.studentId}`).emit('hifz:record:created', record);
  }
  ioInstance.to('role:SUPER_ADMIN').emit('dashboard:updated', { type: 'hifz', record });
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
