import {
  User,
  Student,
  Teacher,
  ClassBatch,
  AttendanceSessionModel,
  AttendanceItem,
  HifzRecord,
  Announcement,
  InstitutionSetting,
  AcademicYear,
  TeacherEvaluationModel,
} from '../models';
import {
  MOCK_USERS,
  MOCK_STUDENTS,
  MOCK_TEACHERS,
  MOCK_CLASSES,
  INITIAL_HIFZ_RECORDS,
  INITIAL_ATTENDANCE_SESSION,
  MOCK_ANNOUNCEMENTS,
  MOCK_EVALUATIONS,
  INSTITUTION_INFO,
} from '../../src/data/mockData';

export async function seedDatabaseIfEmpty() {
  try {
    // 1. Institution Settings
    const settingCount = await InstitutionSetting.countDocuments();
    if (settingCount === 0) {
      await InstitutionSetting.create({
        key: 'HYBA_MAIN',
        name: INSTITUTION_INFO.name,
        arabicName: INSTITUTION_INFO.arabicName,
        shortAddress: INSTITUTION_INFO.shortAddress,
        fullAddress: INSTITUTION_INFO.address,
        phone: INSTITUTION_INFO.phone,
        email: INSTITUTION_INFO.email,
        logoUrl: INSTITUTION_INFO.logoUrl,
        campusBannerUrl: INSTITUTION_INFO.campusBannerUrl,
        currentAcademicYear: '2026 - 2027',
      });
      console.log('[Seed] Institution settings created.');
    } else {
      // Update any existing record to use proper production asset URLs
      await InstitutionSetting.updateMany(
        { key: 'HYBA_MAIN' },
        {
          $set: {
            logoUrl: INSTITUTION_INFO.logoUrl,
            campusBannerUrl: INSTITUTION_INFO.campusBannerUrl,
          },
        }
      );
    }

    // 2. Academic Year
    const yearCount = await AcademicYear.countDocuments();
    if (yearCount === 0) {
      await AcademicYear.create({
        id: 'ay_2026_2027',
        code: '2026 - 2027',
        title: 'Academic Year 1447-1448 AH / 2026-2027 CE',
        startDate: '2026-06-01',
        endDate: '2027-04-30',
        isCurrent: true,
      });
    }

    // 3. Users
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[Seed] Seeding initial users...');
      for (const [key, userObj] of Object.entries(MOCK_USERS)) {
        await User.create({
          id: userObj.id,
          role: userObj.role,
          fullName: userObj.fullName,
          arabicName: userObj.arabicName,
          username: userObj.username || key,
          email: userObj.email,
          password: userObj.password || 'password123',
          phone: userObj.phone,
          avatar: userObj.avatar,
          title: userObj.title,
          referenceId: userObj.referenceId,
          studentId: userObj.studentId,
          linkedStudentIds: userObj.linkedStudentIds,
          assignedClassIds: userObj.assignedClassIds,
          isActive: true,
        });
      }
      console.log(`[Seed] Seeded ${Object.keys(MOCK_USERS).length} users.`);
    }

    // 4. Classes
    const classCount = await ClassBatch.countDocuments();
    if (classCount === 0) {
      console.log('[Seed] Seeding classes...');
      for (const c of MOCK_CLASSES) {
        await ClassBatch.create(c);
      }
    }

    // 5. Teachers
    const teacherCount = await Teacher.countDocuments();
    if (teacherCount === 0) {
      console.log('[Seed] Seeding teachers...');
      for (const t of MOCK_TEACHERS) {
        await Teacher.create(t);
      }
    } else {
      // Ensure faculty phone number and photo are synced
      await Teacher.updateMany(
        { $or: [{ teacherId: 'FAC-012' }, { id: 'usr_teacher_01' }, { fullName: /Ajash/i }] },
        {
          $set: {
            phone: '+91 99610 65284',
            photo: '/assets/images/avatar_usthad_male_1794118062835.jpg',
          },
        }
      );
      await User.updateMany(
        { $or: [{ referenceId: 'FAC-012' }, { id: 'usr_teacher_01' }, { username: 'ajash' }] },
        {
          $set: {
            phone: '+91 99610 65284',
            avatar: '/assets/images/avatar_usthad_male_1794118062835.jpg',
          },
        }
      );
      await Student.updateMany(
        { $or: [{ admissionNumber: '24812' }, { id: 'std_05' }, { fullName: /Ajash/i }] },
        {
          $set: {
            photo: '/assets/images/avatar_student_male_1794118079992.jpg',
          },
        }
      );
    }

    // 6. Students
    const studentCount = await Student.countDocuments();
    if (studentCount === 0) {
      console.log('[Seed] Seeding students...');
      for (const s of MOCK_STUDENTS) {
        await Student.create(s);
      }
      console.log(`[Seed] Seeded ${MOCK_STUDENTS.length} students into MongoDB Atlas.`);
    }

    // 7. Initial Hifz Records
    const hifzCount = await HifzRecord.countDocuments();
    if (hifzCount === 0) {
      console.log('[Seed] Seeding Hifz records...');
      for (const r of INITIAL_HIFZ_RECORDS) {
        await HifzRecord.create({
          ...r,
          academicYear: '2026 - 2027',
        });
      }
    }

    // 8. Attendance Session and items
    const attCount = await AttendanceSessionModel.countDocuments();
    if (attCount === 0 && INITIAL_ATTENDANCE_SESSION) {
      console.log('[Seed] Seeding initial attendance session...');
      await AttendanceSessionModel.create({
        id: INITIAL_ATTENDANCE_SESSION.id,
        classId: INITIAL_ATTENDANCE_SESSION.classId,
        date: INITIAL_ATTENDANCE_SESSION.date,
        sessionHour: INITIAL_ATTENDANCE_SESSION.sessionHour,
        sessionName: INITIAL_ATTENDANCE_SESSION.sessionName,
        usthadId: INITIAL_ATTENDANCE_SESSION.usthadId,
        topic: INITIAL_ATTENDANCE_SESSION.topic,
        records: INITIAL_ATTENDANCE_SESSION.records,
        academicYear: '2026 - 2027',
      });

      // Individual atomic records
      for (const [studentId, status] of Object.entries(INITIAL_ATTENDANCE_SESSION.records)) {
        await AttendanceItem.findOneAndUpdate(
          {
            studentId,
            date: INITIAL_ATTENDANCE_SESSION.date,
            sessionHour: INITIAL_ATTENDANCE_SESSION.sessionHour,
          },
          {
            studentId,
            classId: INITIAL_ATTENDANCE_SESSION.classId,
            date: INITIAL_ATTENDANCE_SESSION.date,
            sessionHour: INITIAL_ATTENDANCE_SESSION.sessionHour,
            status,
            markedByUsthadId: INITIAL_ATTENDANCE_SESSION.usthadId,
            academicYear: '2026 - 2027',
          },
          { upsert: true, new: true }
        );
      }
    }

    // 9. Announcements
    const annCount = await Announcement.countDocuments();
    if (annCount === 0) {
      for (const a of MOCK_ANNOUNCEMENTS) {
        await Announcement.create(a);
      }
    }

    // 10. Evaluations
    const evalCount = await TeacherEvaluationModel.countDocuments();
    if (evalCount === 0) {
      for (const e of MOCK_EVALUATIONS) {
        await TeacherEvaluationModel.create(e);
      }
    }

    console.log('[Seed] Database initialization and verification check complete.');
  } catch (err: any) {
    console.error('[Seed] Error during seeding:', err.message);
  }
}
