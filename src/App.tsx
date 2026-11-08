/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  MOCK_USERS,
  MOCK_STUDENTS,
  MOCK_TEACHERS,
  MOCK_CLASSES,
  INITIAL_ATTENDANCE_SESSION,
  INITIAL_HIFZ_RECORDS,
  MOCK_ANNOUNCEMENTS,
  MOCK_EVALUATIONS,
  INSTITUTION_INFO,
} from './data/mockData';
import {
  UserProfile,
  Student,
  Teacher,
  ClassBatch,
  HifzRecord,
  AttendanceSession,
  TeacherEvaluation,
} from './types';

// Components
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { AdminDashboard } from './components/AdminDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { ParentDashboard } from './components/ParentDashboard';
import { AttendanceModule } from './components/AttendanceModule';
import { HifzModule } from './components/HifzModule';
import { StudentManagement } from './components/StudentManagement';
import { TeacherManagement } from './components/TeacherManagement';
import { ClassManagement } from './components/ClassManagement';
import { ReportsModule } from './components/ReportsModule';

// Modals
import { RoleSwitcherModal } from './components/RoleSwitcherModal';
import { AddHifzRecordModal } from './components/AddHifzRecordModal';
import { StudentIdCardModal } from './components/StudentIdCardModal';
import { TimetableModal } from './components/TimetableModal';
import { FeedbackModal } from './components/FeedbackModal';

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Check if user session exists in localStorage
    const savedId = localStorage.getItem('hyba_auth_user_id');
    return Boolean(savedId);
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const savedId = localStorage.getItem('hyba_auth_user_id');
    if (savedId) {
      const found = Object.values(MOCK_USERS).find((u) => u.id === savedId);
      if (found) return found;
    }
    return MOCK_USERS.admin;
  });

  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Application Data States
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS);
  const [teachers, setTeachers] = useState<Teacher[]>(MOCK_TEACHERS);
  const [classes, setClasses] = useState<ClassBatch[]>(MOCK_CLASSES);
  const [hifzRecords, setHifzRecords] = useState<HifzRecord[]>(INITIAL_HIFZ_RECORDS);
  const [attendanceSession, setAttendanceSession] = useState<AttendanceSession>(INITIAL_ATTENDANCE_SESSION);
  const [evaluations, setEvaluations] = useState<TeacherEvaluation[]>(MOCK_EVALUATIONS);

  // Modals state
  const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = useState<boolean>(false);
  const [isAddHifzOpen, setIsAddHifzOpen] = useState<boolean>(false);
  const [isIdCardOpen, setIsIdCardOpen] = useState<boolean>(false);
  const [idCardStudent, setIdCardStudent] = useState<Student>(MOCK_STUDENTS[4]); // default to Mohammed Ajash
  const [isTimetableOpen, setIsTimetableOpen] = useState<boolean>(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState<boolean>(false);

  // Handle Login
  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setCurrentTab('dashboard');
    localStorage.setItem('hyba_auth_user_id', user.id);
  };

  // Handle Logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('hyba_auth_user_id');
  };

  // Handle Role / Profile Switching
  const handleSelectUser = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('hyba_auth_user_id', user.id);
    setCurrentTab('dashboard'); // Direct to appropriate dashboard for the role
  };

  const handleOpenIdCard = (student?: Student) => {
    if (student) {
      setIdCardStudent(student);
    } else {
      const currentStudentObj = students.find((s) => s.id === currentUser.studentId) || students[4];
      setIdCardStudent(currentStudentObj);
    }
    setIsIdCardOpen(true);
  };

  const handleAddHifzRecord = (newRecord: HifzRecord) => {
    setHifzRecords((prev) => [newRecord, ...prev]);
  };

  const handleSaveAttendanceSession = (session: AttendanceSession) => {
    setAttendanceSession(session);
  };

  const handleAddStudent = (newStudent: Student) => {
    setStudents((prev) => [...prev, newStudent]);
  };

  const handleCompleteEvaluation = (evalId: string, ratings: any) => {
    setEvaluations((prev) =>
      prev.map((e) =>
        e.id === evalId
          ? {
              ...e,
              status: 'Completed',
              ratings: ratings,
            }
          : e
      )
    );
  };

  // If user is not authenticated, render the dedicated Campus Login Page
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const renderMainTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        if (currentUser.role === 'SUPER_ADMIN') {
          return (
            <AdminDashboard
              students={students}
              teachers={teachers}
              classes={classes}
              records={hifzRecords}
              announcements={MOCK_ANNOUNCEMENTS}
              currentUser={currentUser}
              onNavigate={setCurrentTab}
              onOpenAttendance={() => setCurrentTab('attendance')}
              onOpenAddHifz={() => setIsAddHifzOpen(true)}
              onOpenTimetable={() => setIsTimetableOpen(true)}
              onOpenFeedback={() => setIsFeedbackOpen(true)}
            />
          );
        } else if (currentUser.role === 'USTHAD') {
          return (
            <TeacherDashboard
              currentUser={currentUser}
              students={students}
              classes={classes}
              records={hifzRecords}
              onOpenAttendance={() => setCurrentTab('attendance')}
              onOpenAddHifz={() => setIsAddHifzOpen(true)}
              onOpenTimetable={() => setIsTimetableOpen(true)}
              onNavigate={setCurrentTab}
            />
          );
        } else if (currentUser.role === 'STUDENT') {
          const studentObj = students.find((s) => s.id === currentUser.studentId) || students[4];
          return (
            <StudentDashboard
              currentUser={currentUser}
              student={studentObj}
              records={hifzRecords}
              evaluations={evaluations}
              onOpenIdCard={() => handleOpenIdCard(studentObj)}
              onOpenTimetable={() => setIsTimetableOpen(true)}
              onOpenFeedback={() => setIsFeedbackOpen(true)}
              onNavigate={setCurrentTab}
            />
          );
        } else {
          return (
            <ParentDashboard
              currentUser={currentUser}
              students={students}
              records={hifzRecords}
              onOpenIdCard={handleOpenIdCard}
              onNavigate={setCurrentTab}
            />
          );
        }

      case 'attendance':
        return (
          <AttendanceModule
            students={students}
            classes={classes}
            currentUser={currentUser}
            initialSession={attendanceSession}
            onSaveSession={handleSaveAttendanceSession}
          />
        );

      case 'hifz':
        return (
          <HifzModule
            records={hifzRecords}
            students={students}
            currentUser={currentUser}
            onOpenAddModal={() => setIsAddHifzOpen(true)}
          />
        );

      case 'students':
        return (
          <StudentManagement
            students={students}
            classes={classes}
            teachers={teachers}
            currentUser={currentUser}
            onOpenIdCard={handleOpenIdCard}
            onAddStudent={handleAddStudent}
          />
        );

      case 'teachers':
        return (
          <TeacherManagement
            teachers={teachers}
            classes={classes}
            currentUser={currentUser}
          />
        );

      case 'classes':
        return (
          <ClassManagement
            classes={classes}
            teachers={teachers}
            students={students}
            currentUser={currentUser}
          />
        );

      case 'reports':
        return (
          <ReportsModule
            students={students}
            records={hifzRecords}
            classes={classes}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900 antialiased overflow-x-hidden">
      {/* Navbar with mobile bottom bar & top header */}
      <Navbar
        currentUser={currentUser}
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenRoleSwitcher={() => setIsRoleSwitcherOpen(true)}
        onOpenAttendance={() => setCurrentTab('attendance')}
        onOpenAddHifz={() => setIsAddHifzOpen(true)}
        onOpenIdCard={() => handleOpenIdCard()}
        onOpenTimetable={() => setIsTimetableOpen(true)}
        onOpenFeedback={() => setIsFeedbackOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Viewport Content */}
      <main className="flex-1 pb-16 lg:pb-8">
        {renderMainTabContent()}
      </main>

      {/* Responsive Institutional Footer (Clean, unbloated on mobile) */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-6 sm:py-8 border-t border-slate-800 pb-20 lg:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-8 h-8 rounded-lg bg-white/10 p-1 flex items-center justify-center shrink-0">
              <img
                src={INSTITUTION_INFO.logoUrl}
                alt="Footer Emblem"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="text-white font-bold text-xs sm:text-sm">
                {INSTITUTION_INFO.name} ({INSTITUTION_INFO.arabicName})
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-400">
                {INSTITUTION_INFO.shortAddress}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px]">
            <button
              onClick={handleLogout}
              className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
            >
              Log Out to Campus Screen
            </button>
            <span>·</span>
            <button
              onClick={() => setIsRoleSwitcherOpen(true)}
              className="text-slate-300 hover:text-white cursor-pointer"
            >
              Switch Role
            </button>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline font-mono">HYBA v1.0</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <RoleSwitcherModal
        isOpen={isRoleSwitcherOpen}
        onClose={() => setIsRoleSwitcherOpen(false)}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
        onLogout={handleLogout}
      />

      <AddHifzRecordModal
        isOpen={isAddHifzOpen}
        onClose={() => setIsAddHifzOpen(false)}
        students={students}
        currentUser={currentUser}
        onAddRecord={handleAddHifzRecord}
      />

      <StudentIdCardModal
        isOpen={isIdCardOpen}
        onClose={() => setIsIdCardOpen(false)}
        student={idCardStudent}
      />

      <TimetableModal
        isOpen={isTimetableOpen}
        onClose={() => setIsTimetableOpen(false)}
      />

      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        currentUser={currentUser}
        evaluations={evaluations}
        onCompleteEvaluation={handleCompleteEvaluation}
      />
    </div>
  );
}
