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
  onEventCreated?: (event: any) => void;
  onEventUpdated?: (event: any) => void;
  onEventDeleted?: (data: any) => void;
  onTimetableUpdated?: (data: any) => void;
  onFeedbackConfigUpdated?: (config: any) => void;
  onFeedbackSubmitted?: (submission: any) => void;
  onFeedbackReportUpdated?: (report: any) => void;
  onStudentProfilePermissionUpdated?: (data: { campusId: string; allowStudentProfileEdit: boolean; updatedBy?: string }) => void;
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
  if (handlers.onEventCreated) {
    s.on('event:created', handlers.onEventCreated);
  }
  if (handlers.onEventUpdated) {
    s.on('event:updated', handlers.onEventUpdated);
  }
  if (handlers.onEventDeleted) {
    s.on('event:deleted', handlers.onEventDeleted);
  }
  if (handlers.onTimetableUpdated) {
    s.on('timetable:updated', handlers.onTimetableUpdated);
  }
  if (handlers.onFeedbackConfigUpdated) {
    s.on('feedback:config:updated', handlers.onFeedbackConfigUpdated);
  }
  if (handlers.onFeedbackSubmitted) {
    s.on('feedback:submitted', handlers.onFeedbackSubmitted);
  }
  if (handlers.onFeedbackReportUpdated) {
    s.on('feedback:report:updated', handlers.onFeedbackReportUpdated);
  }
  if (handlers.onStudentProfilePermissionUpdated) {
    s.on('student:profile-edit-permission:updated', handlers.onStudentProfilePermissionUpdated);
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
    if (handlers.onEventCreated) s.off('event:created', handlers.onEventCreated);
    if (handlers.onEventUpdated) s.off('event:updated', handlers.onEventUpdated);
    if (handlers.onEventDeleted) s.off('event:deleted', handlers.onEventDeleted);
    if (handlers.onTimetableUpdated) s.off('timetable:updated', handlers.onTimetableUpdated);
    if (handlers.onFeedbackConfigUpdated) s.off('feedback:config:updated', handlers.onFeedbackConfigUpdated);
    if (handlers.onFeedbackSubmitted) s.off('feedback:submitted', handlers.onFeedbackSubmitted);
    if (handlers.onFeedbackReportUpdated) s.off('feedback:report:updated', handlers.onFeedbackReportUpdated);
    if (handlers.onStudentProfilePermissionUpdated) {
      s.off('student:profile-edit-permission:updated', handlers.onStudentProfilePermissionUpdated);
    }
  };
}
