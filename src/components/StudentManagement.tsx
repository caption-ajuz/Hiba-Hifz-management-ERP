import React, { useState, useEffect, useMemo } from 'react';
import { Student, ClassBatch, Teacher, UserProfile, Campus } from '../types';
import { api, getAuthToken } from '../services/api';
import {
  FacultyMentorOption,
  formatDefaultStudentPassword,
  getFacultyDisplayList,
  getUsthadEffectiveClassIds,
  parseCsvRows,
  sortBatchesWithPriority,
} from '../utils/batchUtils';
import {
  GraduationCap,
  Search,
  Filter,
  Plus,
  IdCard,
  BookOpen,
  CalendarCheck,
  User,
  Phone,
  Mail,
  MoreVertical,
  X,
  CheckCircle2,
  UploadCloud,
  Camera,
  Loader2,
  FileSpreadsheet,
  Download,
  AlertCircle,
  FileCheck,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Trash2,
  Layers,
  ChevronDown,
  KeyRound,
} from 'lucide-react';

interface StudentManagementProps {
  students: Student[];
  classes: ClassBatch[];
  teachers: Teacher[];
  currentUser: UserProfile;
  assignedCampus?: Campus;
  onOpenIdCard: (student: Student) => void;
  onAddStudent: (student: Student) => Promise<void> | void;
  onUpdateStudent?: (student: Student) => void;
  onDeleteStudent?: (id: string) => void;
  onAddClass?: (newClass: ClassBatch) => void;
  onRefreshStudents?: () => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({
  students,
  classes,
  teachers,
  currentUser,
  assignedCampus,
  onOpenIdCard,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onAddClass,
  onRefreshStudents,
}) => {
  const isUsthad = currentUser.role === 'USTHAD';
  const assignedClassIds = useMemo(
    () => getUsthadEffectiveClassIds(currentUser, classes),
    [currentUser, classes]
  );

  // Ordered batches: Batch A first, Batch B second, then others
  const sortedClasses = useMemo(() => sortBatchesWithPriority(classes), [classes]);

  // Available classes for filtering and creation based on role
  const availableClasses = useMemo(
    () => (isUsthad ? sortedClasses.filter((c) => assignedClassIds.includes(c.id)) : sortedClasses),
    [isUsthad, sortedClasses, assignedClassIds]
  );

  // Mentors including Campus Mudeer + Usthads
  const [apiMentors, setApiMentors] = useState<FacultyMentorOption[]>([]);
  useEffect(() => {
    let active = true;
    api
      .getClassMentors(currentUser.campusId)
      .then((list) => {
        if (active && Array.isArray(list)) setApiMentors(list);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [currentUser.campusId, teachers.length]);

  const facultyMentors = useMemo(
    () => getFacultyDisplayList(teachers, currentUser, assignedCampus, apiMentors),
    [teachers, currentUser, assignedCampus, apiMentors]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');

  // Inline Batch Editor state
  const [editingBatchStudentId, setEditingBatchStudentId] = useState<string | null>(null);
  const [savingBatchStudentId, setSavingBatchStudentId] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvImportModal, setShowCsvImportModal] = useState(false);

  // New Student Form State
  const [fullName, setFullName] = useState('');
  const [arabicName, setArabicName] = useState('');
  const [rollNumber, setRollNumber] = useState(students.length + 1);
  const [admissionNumber, setAdmissionNumber] = useState(`248${students.length + 1}`);
  const [dob, setDob] = useState('2011-01-01');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('+91 ');
  const [classId, setClassId] = useState(availableClasses[0]?.id || 'batch-a');
  const [photoUrl, setPhotoUrl] = useState('/assets/images/avatar_student_male_1794118079992.jpg');
  const [photoPublicId, setPhotoPublicId] = useState<string | undefined>(undefined);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Edit Student State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editArabicName, setEditArabicName] = useState('');
  const [editRollNumber, setEditRollNumber] = useState(1);
  const [editAdmissionNumber, setEditAdmissionNumber] = useState('');
  const [editDob, setEditDob] = useState('2011-01-01');
  const [editGender, setEditGender] = useState<'Male' | 'Female'>('Male');
  const [editClassId, setEditClassId] = useState('batch-a');
  const [editParentName, setEditParentName] = useState('');
  const [editParentPhone, setEditParentPhone] = useState('+91 ');
  const [editParentEmail, setEditParentEmail] = useState('');
  const [editAccountStatus, setEditAccountStatus] = useState<'Active' | 'On Leave' | 'Completed'>('Active');
  const [editCurrentJuz, setEditCurrentJuz] = useState(1);
  const [editPhotoUrl, setEditPhotoUrl] = useState('/assets/images/avatar_student_male_1794118079992.jpg');
  const [isUpdatingStudent, setIsUpdatingStudent] = useState(false);

  // Delete Student State
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);

  // Batch Quick Creation / Edit State (for use during enrollment or management)
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchToEdit, setBatchToEdit] = useState<ClassBatch | null>(null);
  const [batchName, setBatchName] = useState('');
  const [batchArabicName, setBatchArabicName] = useState('');
  const [batchUsthadId, setBatchUsthadId] = useState(teachers[0]?.id || 'usr_teacher_01');
  const [batchCapacity, setBatchCapacity] = useState(30);
  const [batchAcademicYear, setBatchAcademicYear] = useState('2026 - 2027');
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreviewData, setCsvPreviewData] = useState<any | null>(null);
  const [isParsingCsv, setIsParsingCsv] = useState(false);
  const [isCommittingCsv, setIsCommittingCsv] = useState(false);
  const [importSuccessSummary, setImportSuccessSummary] = useState<any | null>(null);

  // Open Edit Student Modal
  const openEditStudent = (std: Student) => {
    setEditingStudent(std);
    setEditFullName(std.fullName);
    setEditArabicName(std.arabicName || '');
    setEditRollNumber(std.rollNumber);
    setEditAdmissionNumber(std.admissionNumber);
    setEditDob(std.dateOfBirth || '2011-01-01');
    setEditGender(std.gender || 'Male');
    setEditClassId(std.classId);
    setEditParentName(std.parentName || '');
    setEditParentPhone(std.parentPhone || '+91 ');
    setEditParentEmail(std.parentEmail || '');
    setEditAccountStatus(std.accountStatus || 'Active');
    setEditCurrentJuz(std.currentJuz || 1);
    setEditPhotoUrl(std.photo || '/assets/images/avatar_student_male_1794118079992.jpg');
    setShowEditModal(true);
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setIsUpdatingStudent(true);
    try {
      const updates: Partial<Student> = {
        fullName: editFullName,
        arabicName: editArabicName,
        rollNumber: Number(editRollNumber),
        admissionNumber: editAdmissionNumber,
        dateOfBirth: editDob,
        gender: editGender,
        classId: editClassId,
        parentName: editParentName,
        parentPhone: editParentPhone,
        parentEmail: editParentEmail,
        accountStatus: editAccountStatus,
        currentJuz: Number(editCurrentJuz),
        photo: editPhotoUrl,
      };

      const updated = await api.updateStudent(editingStudent.id, updates);
      if (onUpdateStudent) onUpdateStudent(updated);
      if (onRefreshStudents) onRefreshStudents();
      setShowEditModal(false);
    } catch (err: any) {
      alert(`Failed to update student: ${err.message}`);
    } finally {
      setIsUpdatingStudent(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    setIsDeletingStudent(true);
    try {
      await api.deleteStudent(studentToDelete.id);
      if (onDeleteStudent) onDeleteStudent(studentToDelete.id);
      if (onRefreshStudents) onRefreshStudents();
      setStudentToDelete(null);
    } catch (err: any) {
      alert(`Failed to delete student: ${err.message}`);
    } finally {
      setIsDeletingStudent(false);
    }
  };

  // Open Quick Batch Create / Edit
  const openAddBatchModal = () => {
    setBatchToEdit(null);
    setBatchName('');
    setBatchArabicName('');
    setBatchUsthadId(isUsthad ? currentUser.id : facultyMentors[0]?.id || teachers[0]?.id || 'usr_teacher_01');
    setBatchCapacity(30);
    setBatchAcademicYear('2026 - 2027');
    setBatchError(null);
    setShowBatchModal(true);
  };

  const openEditBatchModal = (batch: ClassBatch) => {
    setBatchToEdit(batch);
    setBatchName(batch.name);
    setBatchArabicName(batch.arabicName || '');
    setBatchUsthadId(batch.usthadId);
    setBatchCapacity(batch.capacity || 30);
    setBatchAcademicYear(batch.academicYear || '2026 - 2027');
    setBatchError(null);
    setShowBatchModal(true);
  };

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchError(null);
    setIsSubmittingBatch(true);
    try {
      const payload = {
        name: batchName,
        arabicName: batchArabicName || batchName,
        usthadId: batchUsthadId,
        capacity: Number(batchCapacity),
        academicYear: batchAcademicYear,
        campusId: currentUser.campusId || 'campus-main',
      };

      if (batchToEdit) {
        await api.updateClass(batchToEdit.id, payload);
        if (onRefreshStudents) onRefreshStudents();
        setShowBatchModal(false);
      } else {
        const created = await api.createClass(payload);
        if (onAddClass) onAddClass(created);
        if (onRefreshStudents) onRefreshStudents();
        setClassId(created.id);
        setEditClassId(created.id);
        setShowBatchModal(false);
      }
    } catch (err: any) {
      setBatchError(err.message || 'Failed to save batch');
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  // Inline Batch Quick-Change (Auto-Saves immediately without a Save button)
  const handleQuickBatchChange = async (student: Student, nextClassId: string) => {
    setEditingBatchStudentId(null);
    if (!nextClassId || nextClassId === student.classId) return;

    setSavingBatchStudentId(student.id);
    try {
      const updated = await api.updateStudent(student.id, { classId: nextClassId });
      if (onUpdateStudent) onUpdateStudent(updated);
      if (onRefreshStudents) onRefreshStudents();
      const targetBatch = classes.find((c) => c.id === nextClassId);
      setStatusNotice(
        `${student.fullName} moved to ${targetBatch?.name.split('(')[0].trim() || nextClassId}.`
      );
      setTimeout(() => setStatusNotice(null), 3500);
    } catch (err: any) {
      setStatusNotice(`Failed to update batch: ${err.message}`);
      setTimeout(() => setStatusNotice(null), 4000);
    } finally {
      setSavingBatchStudentId(null);
    }
  };


  // Photo upload handler (Dual-mode: Cloudinary with local server fallback)
  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo must be smaller than 5MB.');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const res = await api.uploadMedia(file, 'students', photoPublicId);
      setPhotoUrl(res.secure_url);
      setPhotoPublicId(res.public_id);
    } catch (err: any) {
      console.error('Photo upload error:', err);
      alert('Failed to upload picture. Please try another image format.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Students visible to current role before search/filter
  const roleVisibleStudents = useMemo(() => {
    if (!isUsthad) return students;
    return students.filter(
      (s) =>
        assignedClassIds.includes(s.classId) ||
        s.assignedTeacherId === currentUser.id ||
        (currentUser.referenceId && s.assignedTeacherId === currentUser.referenceId)
    );
  }, [students, isUsthad, assignedClassIds, currentUser.id, currentUser.referenceId]);

  // Filter students based on role and active filters
  const filteredStudents = useMemo(() => {
    return roleVisibleStudents.filter((s) => {
      if (selectedClassFilter !== 'ALL' && s.classId !== selectedClassFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.fullName.toLowerCase().includes(q) ||
          s.admissionNumber.toLowerCase().includes(q) ||
          s.rollNumber.toString().includes(q) ||
          (s.parentName || '').toLowerCase().includes(q) ||
          (s.arabicName && s.arabicName.includes(q))
        );
      }
      return true;
    });
  }, [roleVisibleStudents, selectedClassFilter, searchQuery]);

  // Group filtered students by Batch (Batch A first, Batch B second, then others)
  const groupedStudentBatches = useMemo(() => {
    const groups: Array<{
      batchId: string;
      batch?: ClassBatch;
      batchLabel: string;
      arabicName?: string;
      mentor?: FacultyMentorOption;
      students: Student[];
    }> = [];

    const assignedIds = new Set<string>();
    const targetBatches = isUsthad ? availableClasses : sortedClasses;

    targetBatches.forEach((batch) => {
      if (selectedClassFilter !== 'ALL' && batch.id !== selectedClassFilter) return;
      const batchStudents = filteredStudents
        .filter((s) => s.classId === batch.id)
        .sort((a, b) => a.rollNumber - b.rollNumber);

      if (batchStudents.length > 0 || (selectedClassFilter === 'ALL' && !searchQuery.trim())) {
        batchStudents.forEach((s) => assignedIds.add(s.id));
        const mentor = facultyMentors.find(
          (m) => m.id === batch.usthadId || m.teacherId === batch.usthadId
        );
        groups.push({
          batchId: batch.id,
          batch,
          batchLabel: batch.name,
          arabicName: batch.arabicName,
          mentor,
          students: batchStudents,
        });
      }
    });

    const ungrouped = filteredStudents
      .filter((s) => !assignedIds.has(s.id))
      .sort((a, b) => a.rollNumber - b.rollNumber);

    if (ungrouped.length > 0) {
      groups.push({
        batchId: 'unassigned',
        batchLabel: 'Other / Unassigned Batch',
        students: ungrouped,
      });
    }

    return groups;
  }, [filteredStudents, availableClasses, sortedClasses, isUsthad, selectedClassFilter, searchQuery, facultyMentors]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isUsthad && !assignedClassIds.includes(classId)) {
      setStatusNotice('You can only enroll students into your assigned batch.');
      return;
    }

    const selectedBatch = classes.find((c) => c.id === classId);
    const newStudent: Student = {
      id: `std_${Date.now()}`,
      rollNumber: Number(rollNumber),
      admissionNumber: admissionNumber.trim(),
      fullName: fullName.trim(),
      arabicName: arabicName.trim() || fullName.trim(),
      photo: photoUrl,
      photoPublicId,
      dateOfBirth: dob,
      gender: gender,
      parentName: parentName.trim(),
      parentPhone: parentPhone.trim(),
      parentEmail: `${fullName.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@gmail.com`,
      admissionDate: new Date().toISOString().split('T')[0],
      campusId: currentUser.campusId || 'campus-main',
      classId: classId,
      assignedTeacherId:
        selectedBatch?.usthadId || (isUsthad ? currentUser.id : teachers[0]?.id || 'usr_teacher_01'),
      accountStatus: 'Active',
      currentJuz: 1,
      completedJuzList: [],
      totalMemorizedAyahs: 0,
      attendanceRate: 100,
    };

    await onAddStudent(newStudent);
    const defaultPass = formatDefaultStudentPassword(newStudent.admissionNumber, newStudent.dateOfBirth);
    setStatusNotice(
      `Enrolled ${newStudent.fullName}. Student Login → Username: ${newStudent.admissionNumber.toLowerCase()} | Default Password: ${defaultPass}`
    );
    setTimeout(() => setStatusNotice(null), 8000);
    setShowAddModal(false);
    setFullName('');
    setArabicName('');
    setParentName('');
  };

  // CSV Import Helpers
  const handleCsvFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setImportSuccessSummary(null);
    setIsParsingCsv(true);

    try {
      const text = await file.text();
      const rows = parseCsvRows(text);

      if (rows.length === 0) {
        alert('Invalid or empty CSV format. Please ensure headers match the required template.');
        setIsParsingCsv(false);
        return;
      }

      const preview = await api.importStudentsCSV(rows, false);
      setCsvPreviewData({ ...preview, originalRows: rows });
    } catch (err: any) {
      alert(`Error reading CSV: ${err.message}`);
    } finally {
      setIsParsingCsv(false);
    }
  };

  const handleConfirmCsvImport = async () => {
    if (!csvPreviewData?.originalRows) return;

    setIsCommittingCsv(true);
    try {
      const result = await api.importStudentsCSV(csvPreviewData.originalRows, true);
      setImportSuccessSummary(result.summary);
      if (onRefreshStudents) {
        onRefreshStudents();
      }
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setIsCommittingCsv(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const templateContent = [
      'admission_number,full_name,arabic_name,date_of_birth,gender,parent_name,parent_phone,batch',
      '24831,Bilal Mohammed,بلال محمد,2011-03-15,Male,Mohammed Ali,+91 94470 12001,A',
      '24832,Yusuf Ahmed,يوسف أحمد,2011-07-22,Male,Ahmed Raza,+91 94470 12002,A',
      '24833,Mustafa Kamal,مصطفى كمال,2010-11-05,Male,Kamal Hassan,+91 94470 12003,B',
    ].join('\n');

    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'hyba_students_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCsv = async () => {
    try {
      const token = getAuthToken();
      const params = new URLSearchParams();
      if (selectedClassFilter !== 'ALL') {
        params.set('classId', selectedClassFilter);
      }

      const res = await fetch(`/api/students/export/csv?${params.toString()}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (!res.ok) throw new Error('Failed to export students CSV');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hyba_students_roster_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    }
  };

  const handleDownloadErrorReport = () => {
    if (!csvPreviewData?.failedRows && !csvPreviewData?.duplicateRows) return;

    const rows = [
      ['Row Number', 'Admission/Student ID', 'Full Name', 'Error Reason'],
      ...(csvPreviewData.duplicateRows || []).map((d: any) => [
        d.rowNumber,
        `"${d.admissionNumber}"`,
        `"${d.fullName}"`,
        `"DUPLICATE: ${d.error}"`,
      ]),
      ...(csvPreviewData.failedRows || []).map((f: any) => [
        f.rowNumber,
        `"${f.admissionNumber}"`,
        `"${f.fullName}"`,
        `"VALIDATION: ${f.error}"`,
      ]),
    ];

    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hyba_import_error_report_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-20">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>{isUsthad ? 'Usthad Mentorship Roster' : 'Academic Registry'}</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            {isUsthad ? 'My Students Directory' : 'Student Management & Profiles'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
            {isUsthad
              ? 'Manage students enrolled in your assigned Tahfeez classes, review progress, and update profiles.'
              : 'Manage enrolled Hifz students in your assigned campus, import rosters, and generate student ID cards.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="Download CSV Roster"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {/* Import CSV */}
          <button
            onClick={() => {
              setCsvFile(null);
              setCsvPreviewData(null);
              setImportSuccessSummary(null);
              setShowCsvImportModal(true);
            }}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-semibold text-xs rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="Bulk Import Students via CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Import CSV</span>
          </button>

          {/* Enroll Student (Super Admin OR Usthad) */}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Enroll Student</span>
          </button>
        </div>
      </div>

      {/* Status / Auto-save / Enrollment Notice */}
      {statusNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{statusNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name, roll # or admission #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
          <span className="text-slate-400">Class Batch:</span>
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-xs text-slate-700 focus:outline-hidden font-medium"
          >
            <option value="ALL">
              {isUsthad
                ? `All Assigned Batches (${roleVisibleStudents.length})`
                : `All Batches (${roleVisibleStudents.length})`}
            </option>
            {availableClasses.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table — Grouped by Batch (Batch A first, Batch B second) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Roll & Student</th>
                <th className="py-3 px-4 font-semibold">Admission #</th>
                <th className="py-3 px-4 font-semibold">Batch (Click to Edit)</th>
                <th className="py-3 px-4 font-semibold">Current Juz</th>
                <th className="py-3 px-4 font-semibold">Total Completed</th>
                <th className="py-3 px-4 font-semibold">Attendance</th>
                <th className="py-3 px-4 font-semibold">Parent Contact</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {groupedStudentBatches.length > 0 && filteredStudents.length > 0 ? (
                groupedStudentBatches.map((group) => (
                  <React.Fragment key={group.batchId}>
                    {/* Batch Group Header Row */}
                    <tr className="bg-emerald-50/70 border-y border-emerald-200/80">
                      <td colSpan={8} className="py-2.5 px-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span className="font-extrabold text-emerald-950 text-xs">
                              {group.batchLabel}
                            </span>
                            {group.arabicName && (
                              <span className="text-[11px] text-emerald-700 font-arabic hidden sm:inline">
                                · {group.arabicName}
                              </span>
                            )}
                            <span className="text-[11px] font-mono font-bold bg-white text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                              {group.students.length} {group.students.length === 1 ? 'Student' : 'Students'}
                            </span>
                          </div>
                          {group.mentor && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-700">
                              <span className="text-slate-400">Mentor:</span>
                              <span className="font-semibold text-slate-900">{group.mentor.fullName}</span>
                              {group.mentor.roleType === 'MUDEER' && (
                                <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 px-1.5 py-0.2 rounded">
                                  Mudeer · Faculty
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>

                    {group.students.length > 0 ? (
                      group.students.map((std) => {
                        const cls = classes.find((c) => c.id === std.classId);
                        const canEditRow =
                          !isUsthad ||
                          assignedClassIds.includes(std.classId) ||
                          std.assignedTeacherId === currentUser.id;
                        const batchChoices = sortedClasses;
                        const isEditingThisBatch = editingBatchStudentId === std.id;
                        const isSavingThisBatch = savingBatchStudentId === std.id;

                        return (
                          <tr key={std.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <span className="w-6 text-center font-mono font-bold text-slate-400">
                                  #{std.rollNumber}
                                </span>
                                <img
                                  src={std.photo || '/assets/images/avatar_student_male_1794118079992.jpg'}
                                  alt={std.fullName}
                                  className="w-9 h-9 rounded-full object-cover border border-slate-200"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.currentTarget.src = '/assets/images/avatar_student_male_1794118079992.jpg';
                                  }}
                                />
                                <div>
                                  <div className="font-bold text-slate-900">{std.fullName}</div>
                                  <div className="text-[10px] text-slate-400 font-arabic">{std.arabicName}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono font-medium text-slate-600">
                              {std.admissionNumber}
                            </td>
                            <td className="py-3 px-4">
                              {isEditingThisBatch ? (
                                <select
                                  autoFocus
                                  value={std.classId}
                                  onChange={(e) => handleQuickBatchChange(std, e.target.value)}
                                  onBlur={() => setEditingBatchStudentId(null)}
                                  aria-label={`Select batch for ${std.fullName}`}
                                  className="bg-white border border-emerald-500 rounded-lg px-2 py-1 text-xs font-semibold text-slate-900 focus:outline-hidden shadow-2xs cursor-pointer"
                                >
                                  {batchChoices.map((b) => (
                                    <option key={b.id} value={b.id}>
                                      {b.name.split('(')[0].trim()}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <button
                                  type="button"
                                  disabled={!canEditRow || isSavingThisBatch}
                                  onClick={() => canEditRow && setEditingBatchStudentId(std.id)}
                                  title={canEditRow ? 'Click to change student batch (auto-saves)' : undefined}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                                    canEditRow
                                      ? 'bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 border-slate-200 hover:border-emerald-300 cursor-pointer'
                                      : 'bg-slate-50 text-slate-700 border-slate-200 cursor-default'
                                  }`}
                                >
                                  {isSavingThisBatch ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-emerald-700" />
                                  ) : (
                                    <>
                                      <span>{cls?.name.split('(')[0].trim() || std.classId || 'Batch A'}</span>
                                      {canEditRow && <ChevronDown className="w-3 h-3 text-slate-400" />}
                                    </>
                                  )}
                                </button>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 font-mono">
                                Juz {std.currentJuz}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono font-medium text-slate-700">
                              {std.completedJuzList?.length || 0} / 30 Juz
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`font-bold font-mono ${
                                  (std.attendanceRate || 95) >= 95 ? 'text-emerald-700' : 'text-amber-700'
                                }`}
                              >
                                {std.attendanceRate || 95}%
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-[11px] text-slate-700 font-medium">{std.parentName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{std.parentPhone}</div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => onOpenIdCard(std)}
                                  className="px-2 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                                  title="View Digital Student ID Card"
                                >
                                  <IdCard className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">ID</span>
                                </button>

                                {canEditRow && (
                                  <>
                                    <button
                                      onClick={() => openEditStudent(std)}
                                      className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                      title="Edit Student Profile"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setStudentToDelete(std)}
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                      title="Delete Student Record"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-4 px-4 text-center text-slate-400 text-[11px] italic">
                          No students currently assigned to {group.batchLabel}.
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    No students match the selected filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSV Import Modal */}
      {showCsvImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-950 text-white">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold">Import Students via CSV</h3>
              </div>
              <button
                onClick={() => setShowCsvImportModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              {/* Step 1: Download Template */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900">1. Download Admission CSV Template</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Required columns: <span className="font-mono text-slate-700">admission_number, full_name, date_of_birth, gender, parent_name, parent_phone, batch</span>
                  </div>
                  <div className="text-[11px] text-emerald-800 mt-1">
                    Batch column accepts <strong>A</strong> (= Batch A) or <strong>B</strong> (= Batch B). Default login password is set to <span className="font-mono">&lt;AdmissionNumber&gt;@&lt;YYYY-MM-DD&gt;</span>.
                  </div>
                </div>
                <button
                  onClick={handleDownloadSampleCsv}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:border-emerald-600 text-slate-700 hover:text-emerald-800 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 self-start sm:self-center"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template</span>
                </button>
              </div>

              {/* Step 2: Upload CSV */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  2. Select CSV File to Validate & Import
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center hover:border-emerald-500 transition-colors bg-slate-50/50">
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <div className="text-xs text-slate-600">
                    {csvFile ? (
                      <span className="font-bold text-emerald-800">{csvFile.name}</span>
                    ) : (
                      'Click to browse or drag and drop your .csv file here'
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileSelect}
                    className="mt-2 text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                </div>
              </div>

              {/* Parsing Indicator */}
              {isParsingCsv && (
                <div className="p-3 bg-emerald-50 rounded-xl text-emerald-800 text-center flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                  <span>Validating CSV structure, matching batches, and checking duplicates...</span>
                </div>
              )}

              {/* Import Preview Summary */}
              {csvPreviewData && !importSuccessSummary && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>3. Validation, Batch Mapping & Password Preview</span>
                    <span className="font-mono text-slate-500">{csvPreviewData.summary.totalRows} Total Rows</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                      <div className="text-[10px] text-emerald-800 font-bold uppercase">Ready to Import</div>
                      <div className="text-lg font-mono font-extrabold text-emerald-700">
                        {csvPreviewData.summary.successfulCount}
                      </div>
                    </div>
                    <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                      <div className="text-[10px] text-amber-800 font-bold uppercase">Duplicates Skipped</div>
                      <div className="text-lg font-mono font-extrabold text-amber-700">
                        {csvPreviewData.summary.duplicateCount}
                      </div>
                    </div>
                    <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
                      <div className="text-[10px] text-rose-800 font-bold uppercase">Validation Errors</div>
                      <div className="text-lg font-mono font-extrabold text-rose-700">
                        {csvPreviewData.summary.failedCount}
                      </div>
                    </div>
                  </div>

                  {/* Preview of Batch Assignments & Default Student Passwords */}
                  {Array.isArray(csvPreviewData.successfulRows) && csvPreviewData.successfulRows.length > 0 && (
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-50 text-slate-500 uppercase">
                          <tr>
                            <th className="py-2 px-2.5">Adm #</th>
                            <th className="py-2 px-2.5">Student Name</th>
                            <th className="py-2 px-2.5">Assigned Batch</th>
                            <th className="py-2 px-2.5">Default Password</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {csvPreviewData.successfulRows.slice(0, 6).map((row: any, idx: number) => (
                            <tr key={idx}>
                              <td className="py-1.5 px-2.5 font-mono font-semibold text-slate-700">{row.admissionNumber}</td>
                              <td className="py-1.5 px-2.5 font-semibold text-slate-900">{row.fullName}</td>
                              <td className="py-1.5 px-2.5 text-emerald-800 font-semibold">{row.batchLabel}</td>
                              <td className="py-1.5 px-2.5 font-mono text-slate-600">{row.defaultPasswordPreview}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Errors / Warnings List if any */}
                  {(csvPreviewData.summary.duplicateCount > 0 || csvPreviewData.summary.failedCount > 0) && (
                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-amber-900 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-700" />
                          <span>Rows Requiring Attention ({csvPreviewData.summary.duplicateCount + csvPreviewData.summary.failedCount})</span>
                        </div>
                        <button
                          onClick={handleDownloadErrorReport}
                          className="text-[11px] font-bold text-amber-800 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download Error Report</span>
                        </button>
                      </div>
                      <div className="text-[11px] text-amber-800 max-h-24 overflow-y-auto space-y-1">
                        {csvPreviewData.duplicateRows.slice(0, 5).map((d: any, idx: number) => (
                          <div key={idx}>Row #{d.rowNumber} ({d.fullName}): {d.error}</div>
                        ))}
                        {csvPreviewData.failedRows.slice(0, 5).map((f: any, idx: number) => (
                          <div key={idx}>Row #{f.rowNumber} ({f.fullName}): {f.error}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setCsvPreviewData(null)}
                      className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmCsvImport}
                      disabled={isCommittingCsv || csvPreviewData.summary.successfulCount === 0}
                      className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1.5"
                    >
                      {isCommittingCsv ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving to Database...</span>
                        </>
                      ) : (
                        <span>Confirm & Import ({csvPreviewData.summary.successfulCount} Students)</span>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Success Result */}
              {importSuccessSummary && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 text-center animate-fade-in">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-950 text-sm">CSV Import Completed Successfully!</h4>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      {importSuccessSummary.successfulCount} new student records have been persisted to the academic roster.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCsvImportModal(false)}
                    className="px-4 py-2 bg-emerald-700 text-white font-bold text-xs rounded-xl hover:bg-emerald-800"
                  >
                    Close Window
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enroll Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-950 text-white">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold">
                  {isUsthad ? 'Enroll Student into My Class' : 'Enroll New Tahfeez Student'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Dual-mode Photo Upload & Preview */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-emerald-500 bg-slate-100 shrink-0">
                  <img
                    src={photoUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-900">Student Profile Picture</div>
                  <div className="text-[11px] text-slate-500">Dual-mode storage (Cloudinary CDN + Local Server)</div>
                  <label className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 hover:border-emerald-500 text-slate-700 hover:text-emerald-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-2xs">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isUploadingPhoto ? 'Uploading...' : 'Upload Picture'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoFileChange}
                      className="hidden"
                      disabled={isUploadingPhoto}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Student Full Name *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Tariq Anwar"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Arabic Name
                  </label>
                  <input
                    type="text"
                    placeholder="طارق أنور"
                    value={arabicName}
                    onChange={(e) => setArabicName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-arabic"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Admission Number *
                  </label>
                  <input
                    required
                    type="text"
                    value={admissionNumber}
                    onChange={(e) => setAdmissionNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Roll Number *
                  </label>
                  <input
                    required
                    type="number"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Class / Batch Assignment *
                    </label>
                    <button
                      type="button"
                      onClick={openAddBatchModal}
                      className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer hover:underline"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Add Batch</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={classId}
                      onChange={(e) => setClassId(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-medium"
                    >
                      {availableClasses.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                    {availableClasses.find((c) => c.id === classId) && (
                      <button
                        type="button"
                        onClick={() => openEditBatchModal(availableClasses.find((c) => c.id === classId)!)}
                        className="p-2 text-slate-500 hover:text-emerald-700 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
                        title="Edit this batch"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Parent / Guardian Full Name *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Anwar Hussain"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Parent Phone Number *
                </label>
                <input
                  required
                  type="text"
                  placeholder="+91 94470 12345"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                />
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-[11px] text-emerald-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  Student portal account is automatically created using Admission # as username and{' '}
                  <strong className="font-mono">
                    {formatDefaultStudentPassword(admissionNumber || '<AdmNo>', dob)}
                  </strong>{' '}
                  as default password.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs cursor-pointer"
                >
                  Save & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditModal && editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-950 text-white">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm sm:text-base font-bold">Edit Student Profile & Enrollment</h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="p-6 space-y-3.5 text-xs overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Student Full Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Arabic Name
                  </label>
                  <input
                    type="text"
                    value={editArabicName}
                    onChange={(e) => setEditArabicName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-arabic"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Admission Number *
                  </label>
                  <input
                    required
                    type="text"
                    value={editAdmissionNumber}
                    onChange={(e) => setEditAdmissionNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Roll Number *
                  </label>
                  <input
                    required
                    type="number"
                    value={editRollNumber}
                    onChange={(e) => setEditRollNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Gender
                  </label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-medium"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">
                      Class / Batch *
                    </label>
                    <button
                      type="button"
                      onClick={openAddBatchModal}
                      className="text-[10px] text-emerald-700 font-bold hover:underline"
                    >
                      + Add Batch
                    </button>
                  </div>
                  <select
                    value={editClassId}
                    onChange={(e) => setEditClassId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-medium"
                  >
                    {sortedClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Account Status
                  </label>
                  <select
                    value={editAccountStatus}
                    onChange={(e) => setEditAccountStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-medium"
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Current Memorization (Juz)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={editCurrentJuz}
                    onChange={(e) => setEditCurrentJuz(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Parent Contact Phone *
                  </label>
                  <input
                    required
                    type="text"
                    value={editParentPhone}
                    onChange={(e) => setEditParentPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Parent / Guardian Full Name
                </label>
                <input
                  type="text"
                  value={editParentName}
                  onChange={(e) => setEditParentName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStudent}
                  className="px-5 py-2 font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs cursor-pointer"
                >
                  {isUpdatingStudent ? 'Saving...' : 'Update Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Student Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Delete Student Record?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete <strong>{studentToDelete.fullName}</strong> ({studentToDelete.admissionNumber})?
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setStudentToDelete(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStudent}
                disabled={isDeletingStudent}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isDeletingStudent ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add / Edit Batch Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-950 text-white">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm sm:text-base font-bold">
                  {batchToEdit ? 'Edit Class Batch' : 'Create New Class Batch'}
                </h3>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="p-6 space-y-3.5 text-xs">
              {batchError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{batchError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Batch Name *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Hifz Batch D (Al-Kawthar)"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Arabic Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. شعبة الكوثر"
                  value={batchArabicName}
                  onChange={(e) => setBatchArabicName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-arabic"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mentor Faculty (Usthad / Mudeer)
                </label>
                <select
                  value={batchUsthadId}
                  onChange={(e) => setBatchUsthadId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-medium"
                >
                  {facultyMentors.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} {t.roleType === 'MUDEER' ? '(Mudeer · Campus Faculty)' : `(${t.teacherId})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Academic Year
                </label>
                <input
                  type="text"
                  value={batchAcademicYear}
                  onChange={(e) => setBatchAcademicYear(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBatch}
                  className="px-5 py-2 font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs cursor-pointer"
                >
                  {isSubmittingBatch ? 'Saving...' : batchToEdit ? 'Save Changes' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
