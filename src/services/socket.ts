import { io, Socket } from 'socket.io-client';
import { getAuthToken } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = getAuthToken();

    socket = io(window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      // connected cleanly
    });

    socket.on('disconnect', (reason) => {
      // auto reconnect will trigger
    });

    socket.on('connect_error', (error) => {
      // silent retry
    });
  }

  return socket;
}

export function subscribeToRealtimeEvents(handlers: {
  onAttendanceUpdated?: (data: any) => void;
  onHifzRecordCreated?: (record: any) => void;
  onHifzRecordUpdated?: (record: any) => void;
  onStudentUpdated?: (student: any) => void;
  onTeacherUpdated?: (teacher: any) => void;
  onAnnouncementCreated?: (announcement: any) => void;
  onDashboardUpdated?: (data: any) => void;
}) {
  const s = getSocket();

  if (handlers.onAttendanceUpdated) {
    s.on('attendance:updated', handlers.onAttendanceUpdated);
  }
  if (handlers.onHifzRecordCreated) {
    s.on('hifz:record:created', handlers.onHifzRecordCreated);
  }
  if (handlers.onHifzRecordUpdated) {
    s.on('hifz:record:updated', handlers.onHifzRecordUpdated);
  }
  if (handlers.onStudentUpdated) {
    s.on('student:updated', handlers.onStudentUpdated);
  }
  if (handlers.onTeacherUpdated) {
    s.on('teacher:updated', handlers.onTeacherUpdated);
  }
  if (handlers.onAnnouncementCreated) {
    s.on('announcement:created', handlers.onAnnouncementCreated);
  }
  if (handlers.onDashboardUpdated) {
    s.on('dashboard:updated', handlers.onDashboardUpdated);
  }

  // Return cleanup function
  return () => {
    if (handlers.onAttendanceUpdated) s.off('attendance:updated', handlers.onAttendanceUpdated);
    if (handlers.onHifzRecordCreated) s.off('hifz:record:created', handlers.onHifzRecordCreated);
    if (handlers.onHifzRecordUpdated) s.off('hifz:record:updated', handlers.onHifzRecordUpdated);
    if (handlers.onStudentUpdated) s.off('student:updated', handlers.onStudentUpdated);
    if (handlers.onTeacherUpdated) s.off('teacher:updated', handlers.onTeacherUpdated);
    if (handlers.onAnnouncementCreated) s.off('announcement:created', handlers.onAnnouncementCreated);
    if (handlers.onDashboardUpdated) s.off('dashboard:updated', handlers.onDashboardUpdated);
  };
}
