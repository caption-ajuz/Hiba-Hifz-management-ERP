import { Campus, ClassBatch, Teacher, UserProfile } from '../types';

export interface FacultyMentorOption extends Teacher {
  roleType?: 'MUDEER' | 'USTHAD';
}

/**
 * Dynamically computes all class IDs assigned to a staff member (Usthad or Mudeer)
 * by combining `user.assignedClassIds` and any ClassBatch whose `usthadId` matches
 * the user's `id` or `referenceId`.
 */
export function getUsthadEffectiveClassIds(
  currentUser: UserProfile,
  classes: ClassBatch[]
): string[] {
  const idSet = new Set<string>(currentUser.assignedClassIds || []);
  classes.forEach((cls) => {
    if (
      cls.usthadId === currentUser.id ||
      (currentUser.referenceId && cls.usthadId === currentUser.referenceId)
    ) {
      idSet.add(cls.id);
    }
  });
  return Array.from(idSet);
}

/**
 * Computes sort weight so Batch A always appears first, Batch B second,
 * followed by other batches alphabetically.
 */
function getBatchSortRank(batch: ClassBatch): number {
  const id = (batch.id || '').toLowerCase();
  const name = (batch.name || '').toLowerCase();
  if (id === 'batch-a' || /\bbatch\s*a\b/i.test(name)) return 1;
  if (id === 'batch-b' || /\bbatch\s*b\b/i.test(name)) return 2;
  const letterMatch = name.match(/\bbatch\s*([a-z])\b/i);
  if (letterMatch) {
    return 10 + letterMatch[1].toLowerCase().charCodeAt(0) - 97;
  }
  return 100;
}

export function sortBatchesWithPriority(classes: ClassBatch[]): ClassBatch[] {
  return [...classes].sort((a, b) => {
    const rankDiff = getBatchSortRank(a) - getBatchSortRank(b);
    if (rankDiff !== 0) return rankDiff;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Builds a unified faculty/mentor list containing both Campus Mudeer(s) and Usthads.
 */
export function getFacultyDisplayList(
  teachers: Teacher[],
  currentUser?: UserProfile,
  assignedCampus?: Campus,
  apiMentors?: FacultyMentorOption[]
): FacultyMentorOption[] {
  const map = new Map<string, FacultyMentorOption>();

  if (Array.isArray(apiMentors)) {
    for (const m of apiMentors) {
      map.set(m.id, m);
    }
  }

  if (currentUser?.role === 'MUDEER' && !map.has(currentUser.id)) {
    map.set(currentUser.id, {
      id: currentUser.id,
      teacherId: currentUser.referenceId || 'MUDEER',
      fullName: currentUser.fullName,
      arabicTitle: currentUser.arabicName || currentUser.fullName,
      photo: currentUser.avatar || '/assets/images/avatar_mudir_male_1794118044233.jpg',
      phone: currentUser.phone || '',
      email: currentUser.email || '',
      qualification: 'Campus Mudeer · Faculty',
      experienceYears: 15,
      assignedCampusId: currentUser.campusId || 'campus-main',
      assignedClassIds: [],
      accountStatus: 'Active',
      specialization: 'Campus Administration & Hifz Supervision',
      roleType: 'MUDEER',
    });
  } else if (
    assignedCampus?.mudeerUserId &&
    assignedCampus.principalName &&
    !map.has(assignedCampus.mudeerUserId)
  ) {
    map.set(assignedCampus.mudeerUserId, {
      id: assignedCampus.mudeerUserId,
      teacherId: 'MUDEER',
      fullName: assignedCampus.principalName,
      arabicTitle: assignedCampus.principalName,
      photo: '/assets/images/avatar_mudir_male_1794118044233.jpg',
      phone: assignedCampus.mudeerPhone || '',
      email: assignedCampus.mudeerEmail || '',
      qualification: 'Campus Mudeer · Faculty',
      experienceYears: 15,
      assignedCampusId: assignedCampus.id,
      assignedClassIds: [],
      accountStatus: 'Active',
      specialization: 'Campus Administration & Hifz Supervision',
      roleType: 'MUDEER',
    });
  }

  for (const t of teachers) {
    if (!map.has(t.id)) {
      map.set(t.id, { ...t, roleType: 'USTHAD' });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.roleType === 'MUDEER' && b.roleType !== 'MUDEER') return -1;
    if (b.roleType === 'MUDEER' && a.roleType !== 'MUDEER') return 1;
    return a.fullName.localeCompare(b.fullName);
  });
}

/**
 * RFC-4180 compliant CSV parser supporting UTF-8 BOM, quoted fields with commas,
 * and escaped quotes ("").
 */
export function parseCsvRows(text: string): Record<string, string>[] {
  const cleanText = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentField = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];
    const next = cleanText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentField += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (ch === '\r' || ch === '\n') {
        if (ch === '\r' && next === '\n') i++;
        currentRow.push(currentField.trim());
        if (currentRow.some((cell) => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += ch;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.replace(/^["']|["']$/g, '').trim());
  const parsed: Record<string, string>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    const obj: Record<string, string> = {};
    let hasAnyValue = false;
    for (let j = 0; j < headers.length; j++) {
      const val = (values[j] || '').trim();
      if (val) hasAnyValue = true;
      obj[headers[j]] = val;
    }
    if (hasAnyValue) {
      parsed.push(obj);
    }
  }

  return parsed;
}

/**
 * Generates the default student login password (Date of Birth in DD-MM-YYYY)
 * matching the server-side `buildDefaultStudentPassword`.
 */
export function formatDefaultStudentPassword(
  _admissionNumber: string,
  dateOfBirth?: string
): string {
  const dob = String(dateOfBirth || '').trim() || '2011-01-01';
  const isoMatch = dob.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[3].padStart(2, '0')}-${isoMatch[2].padStart(2, '0')}-${isoMatch[1]}`;
  }
  return dob;
}
