import { Router, Request, Response } from 'express';
import { Campus } from '../models/Campus';
import { Student } from '../models/Student';
import { Teacher } from '../models/Teacher';
import { ClassBatch } from '../models/ClassBatch';
import { authenticate, AuthRequest, authorize, logAuditEvent } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const campusSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Campus Name is required'),
  code: z.string().min(2, 'Campus Code is required'),
  arabicName: z.string().optional(),
  address: z.string().min(2, 'Campus Address is required'),
  phone: z.string().min(5, 'Contact Phone is required'),
  email: z.string().email('Valid Email is required'),
  logo: z.string().optional(),
  bannerUrl: z.string().optional(),
  status: z.enum(['Active', 'Inactive']).default('Active'),
  establishedYear: z.string().default('1994'),
  principalName: z.string().optional(),
});

// Initial seed campuses fallback
const DEFAULT_CAMPUSES = [
  {
    id: 'campus-main',
    name: 'Markazul Hidayathil Islamiyya Main Campus',
    code: 'MHI-MAIN',
    arabicName: 'مركز الهداية الإسلامية - المقر الرئيسي',
    address: 'Hidaya Nagar, Kombam, Kodakkad (PO), Mannarkkad, Palakkad, Kerala 678583',
    phone: '+91 4924 222123',
    email: 'hifz@markazulhidaya.edu.in',
    logo: '/assets/aistudio/__Hidaya_Updates_01__20261021_215417_1e0cd263.jpg',
    bannerUrl: '/assets/aistudio/20261108_111844_2_12947e14.jpg',
    status: 'Active',
    establishedYear: '1994',
    principalName: 'Sheikh Dr. Abdul Wahab Al-Qasimi',
  },
  {
    id: 'campus-city',
    name: 'HYBA City Tahfeez Center',
    code: 'HYBA-CITY',
    arabicName: 'فرع المدينة لتحفيظ القرآن',
    address: 'Kollamkode Bypass Road, Mannarkkad Central, Palakkad',
    phone: '+91 4924 223400',
    email: 'city.campus@markazulhidaya.edu.in',
    logo: '/assets/aistudio/__Hidaya_Updates_01__20261021_215417_1e0cd263.jpg',
    bannerUrl: '/assets/images/campus_architecture_bg_1794109156055.jpg',
    status: 'Active',
    establishedYear: '2021',
    principalName: 'Usthad Hafiz Luqman Al-Bukhari',
  },
];

// GET /api/campuses - List all campuses with statistical counts
router.get('/', authenticate, async (_req: Request, res: Response) => {
  try {
    let campuses = await Campus.find().sort({ createdAt: 1 }).lean();

    if (campuses.length === 0) {
      await Campus.insertMany(DEFAULT_CAMPUSES);
      campuses = await Campus.find().sort({ createdAt: 1 }).lean();
    }

    // Attach real-time counts for students, teachers, and classes per campus
    const enhancedCampuses = await Promise.all(
      campuses.map(async (campus) => {
        const [studentCount, teacherCount, classCount] = await Promise.all([
          Student.countDocuments({ campusId: campus.id }),
          Teacher.countDocuments({ assignedCampusId: campus.id }),
          ClassBatch.countDocuments({ campusId: campus.id }),
        ]);

        return {
          ...campus,
          studentCount,
          teacherCount,
          classCount,
        };
      })
    );

    return res.json({ success: true, data: enhancedCampuses });
  } catch (err: any) {
    console.error('[Campuses] Error fetching campuses:', err);
    return res.json({ success: true, data: DEFAULT_CAMPUSES });
  }
});

// GET /api/campuses/:id/details - Campus-wise students, teachers & classes
router.get('/:id/details', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const campus = await Campus.findOne({ id }).lean();
    if (!campus) {
      return res.status(404).json({ success: false, error: 'Campus not found' });
    }

    const [students, teachers, classes] = await Promise.all([
      Student.find({ campusId: id }).sort({ rollNumber: 1 }).lean(),
      Teacher.find({ assignedCampusId: id }).sort({ fullName: 1 }).lean(),
      ClassBatch.find({ campusId: id }).lean(),
    ]);

    return res.json({
      success: true,
      data: {
        campus,
        students,
        teachers,
        classes,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve campus roster' });
  }
});

// POST /api/campuses - Super Admin creates a new campus
router.post('/', authenticate, authorize('SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const parse = campusSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Invalid campus payload',
      });
    }

    const data = parse.data;
    const cleanCode = data.code.toUpperCase().trim();

    const existing = await Campus.findOne({ code: cleanCode });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `A campus with code '${cleanCode}' already exists.`,
      });
    }

    const campusId = data.id || `campus-${Date.now().toString(36)}`;
    const newCampus = await Campus.create({
      ...data,
      id: campusId,
      code: cleanCode,
    });

    await logAuditEvent('CAMPUS_CREATE', req.user, 'Campus', campusId, {
      name: newCampus.name,
      code: newCampus.code,
    });

    return res.status(201).json({ success: true, data: newCampus });
  } catch (err: any) {
    console.error('[Campuses] Error creating campus:', err);
    return res.status(500).json({ success: false, error: 'Failed to create campus' });
  }
});

// PUT /api/campuses/:id - Super Admin edits campus info or toggles active/inactive
router.put('/:id', authenticate, authorize('SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await Campus.findOne({ id });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Campus not found' });
    }

    const updated = await Campus.findOneAndUpdate({ id }, { $set: req.body }, { new: true });

    await logAuditEvent('CAMPUS_UPDATE', req.user, 'Campus', id, req.body);

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update campus' });
  }
});

// DELETE /api/campuses/:id - Super Admin deletes a campus
router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if campus has students or classes assigned
    const [studentCount, classCount] = await Promise.all([
      Student.countDocuments({ campusId: id }),
      ClassBatch.countDocuments({ campusId: id }),
    ]);

    if (studentCount > 0 || classCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete campus: It currently contains ${studentCount} students and ${classCount} classes. Reassign them first.`,
      });
    }

    await Campus.deleteOne({ id });
    await logAuditEvent('CAMPUS_DELETE', req.user, 'Campus', id);

    return res.json({ success: true, message: 'Campus deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete campus' });
  }
});

export default router;
