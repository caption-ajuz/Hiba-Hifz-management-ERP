import { Router, Request, Response } from 'express';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransport,
} from '@simplewebauthn/server';
import jwt from 'jsonwebtoken';
import { User, IWebAuthnCredential } from '../models/User';
import {
  authenticate,
  AuthRequest,
  generateToken,
  setSessionCookie,
  extractTokenFromRequest,
  logAuditEvent,
} from '../middleware/auth';
import {
  isMongoReady,
  getRuntimeDb,
  saveRuntimeDb,
  sanitizeRuntimeUser,
  RuntimeWebAuthnCredential,
} from '../config/runtimeStore';
import { resolveEffectiveAssignedClassIds } from '../utils/accessHelpers';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'hyba_secure_jwt_secret_key_2026';

interface PendingChallenge {
  challenge: string;
  userId: string;
  rpID: string;
  origin: string;
  expiresAt: number;
}

const challengeStore = new Map<string, PendingChallenge>();
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function cleanupExpiredChallenges() {
  const now = Date.now();
  for (const [key, entry] of challengeStore.entries()) {
    if (entry.expiresAt < now) {
      challengeStore.delete(key);
    }
  }
}

function getWebAuthnRpConfig(req: Request): { rpName: string; rpID: string; origin: string } {
  const rpName = 'Hyba Campus Portal';
  const reqOrigin = req.headers.origin;
  if (reqOrigin) {
    try {
      const parsed = new URL(reqOrigin);
      return {
        rpName,
        rpID: parsed.hostname,
        origin: parsed.origin,
      };
    } catch {
      // Fallback below
    }
  }

  const forwardedHost = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000').split(',')[0].trim();
  const forwardedProto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  const hostname = forwardedHost.split(':')[0];

  return {
    rpName,
    rpID: hostname || 'localhost',
    origin: `${forwardedProto}://${forwardedHost}`,
  };
}

function uint8ToBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

function base64UrlToUint8(str: string): Uint8Array<ArrayBuffer> {
  const buf = Buffer.from(str, 'base64url');
  const ab = new ArrayBuffer(buf.length);
  const view = new Uint8Array(ab);
  view.set(buf);
  return view;
}

async function findUserByIdentifier(identifier: { userId?: string; username?: string }) {
  const cleanUsername = identifier.username?.trim().toLowerCase();
  if (isMongoReady()) {
    if (identifier.userId) {
      return await User.findOne({ id: identifier.userId });
    }
    if (cleanUsername) {
      return await User.findOne({
        $or: [{ username: cleanUsername }, { email: cleanUsername }, { referenceId: cleanUsername }],
      });
    }
    return null;
  }

  const db = getRuntimeDb();
  if (identifier.userId) {
    return db.users.find((u) => u.id === identifier.userId) || null;
  }
  if (cleanUsername) {
    return (
      db.users.find(
        (u) =>
          u.username.toLowerCase() === cleanUsername ||
          u.email.toLowerCase() === cleanUsername ||
          (u.referenceId && u.referenceId.toLowerCase() === cleanUsername)
      ) || null
    );
  }
  return null;
}

// GET /api/auth/webauthn/status - Check if current user (or specified userId) has biometric credentials enrolled
router.get('/status', async (req: Request, res: Response) => {
  try {
    let targetUserId = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
    let isAuthenticatedUser = false;

    const token = extractTokenFromRequest(req);
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
        if (!targetUserId || targetUserId === decoded.id) {
          targetUserId = decoded.id;
          isAuthenticatedUser = true;
        }
      } catch {
        // Token invalid or expired
      }
    }

    if (!targetUserId) {
      return res.json({
        success: true,
        data: {
          hasBiometrics: false,
          credentialCount: 0,
          credentials: [],
        },
      });
    }

    const user: any = await findUserByIdentifier({ userId: targetUserId });
    const creds: Array<IWebAuthnCredential | RuntimeWebAuthnCredential> = user?.webauthnCredentials || [];

    return res.json({
      success: true,
      data: {
        hasBiometrics: creds.length > 0,
        credentialCount: creds.length,
        credentials: isAuthenticatedUser
          ? creds.map((c) => ({
              credentialID: c.credentialID,
              deviceName: c.deviceName || 'Trusted Biometric Device',
              authenticatorType: c.authenticatorType || 'platform',
              createdAt: c.createdAt,
              lastUsedAt: c.lastUsedAt,
            }))
          : [],
      },
    });
  } catch (err: any) {
    console.error('[WebAuthn] Status error:', err);
    return res.status(500).json({ success: false, error: 'Failed to check biometric status.' });
  }
});

// POST /api/auth/webauthn/register/options - Begin Fingerprint / Face Unlock enrollment
router.post('/register/options', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    cleanupExpiredChallenges();
    const reqUser = req.user!;
    const { rpName, rpID, origin } = getWebAuthnRpConfig(req);

    const userDoc: any = await findUserByIdentifier({ userId: reqUser.id });
    if (!userDoc) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    const existingCreds: Array<IWebAuthnCredential | RuntimeWebAuthnCredential> =
      userDoc.webauthnCredentials || [];

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(userDoc.id),
      userName: userDoc.username || userDoc.email || userDoc.id,
      userDisplayName: userDoc.fullName,
      attestationType: 'none',
      excludeCredentials: existingCreds.map((cred) => ({
        id: cred.credentialID,
        transports: (cred.transports || ['internal']) as AuthenticatorTransport[],
      })),
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
    });

    challengeStore.set(`reg:${userDoc.id}`, {
      challenge: options.challenge,
      userId: userDoc.id,
      rpID,
      origin,
      expiresAt: Date.now() + CHALLENGE_TTL_MS,
    });

    return res.json({
      success: true,
      data: options,
    });
  } catch (err: any) {
    console.error('[WebAuthn] Registration options error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate biometric registration options.',
    });
  }
});

// POST /api/auth/webauthn/register/verify - Verify and store platform public key credential
router.post('/register/verify', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const reqUser = req.user!;
    const { response, deviceName } = req.body as {
      response?: RegistrationResponseJSON;
      deviceName?: string;
    };

    if (!response || !response.id) {
      return res.status(400).json({ success: false, error: 'Missing biometric registration payload.' });
    }

    const pending = challengeStore.get(`reg:${reqUser.id}`);
    if (!pending || pending.expiresAt < Date.now()) {
      challengeStore.delete(`reg:${reqUser.id}`);
      return res.status(400).json({
        success: false,
        error: 'Biometric enrollment challenge expired. Please try again.',
      });
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: pending.challenge,
      expectedOrigin: pending.origin,
      expectedRPID: pending.rpID,
      requireUserVerification: true,
    });

    challengeStore.delete(`reg:${reqUser.id}`);

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({
        success: false,
        error: 'Biometric verification failed. Please try again.',
      });
    }

    const { credential } = verification.registrationInfo;
    const newCredRecord = {
      credentialID: credential.id,
      publicKey: uint8ToBase64Url(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports || ['internal'],
      deviceName: (deviceName || 'Trusted Biometric Device').slice(0, 80),
      authenticatorType: 'platform',
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };

    if (isMongoReady()) {
      const userDoc = await User.findOne({ id: reqUser.id });
      if (!userDoc) {
        return res.status(404).json({ success: false, error: 'User account not found.' });
      }
      const existing = userDoc.webauthnCredentials || [];
      const filtered = existing.filter((c) => c.credentialID !== newCredRecord.credentialID);
      filtered.push({
        ...newCredRecord,
        createdAt: new Date(newCredRecord.createdAt),
        lastUsedAt: new Date(newCredRecord.lastUsedAt),
      });
      userDoc.webauthnCredentials = filtered;
      await userDoc.save();
      await logAuditEvent(
        'WEBAUTHN_ENROLLED',
        reqUser,
        'User',
        userDoc.id,
        { deviceName: newCredRecord.deviceName },
        req.ip
      );
    } else {
      const db = getRuntimeDb();
      const rtUser = db.users.find((u) => u.id === reqUser.id);
      if (!rtUser) {
        return res.status(404).json({ success: false, error: 'User account not found.' });
      }
      const existing = rtUser.webauthnCredentials || [];
      rtUser.webauthnCredentials = [
        ...existing.filter((c) => c.credentialID !== newCredRecord.credentialID),
        newCredRecord,
      ];
      rtUser.updatedAt = new Date().toISOString();
      saveRuntimeDb(db);
    }

    return res.json({
      success: true,
      data: {
        verified: true,
        credentialID: newCredRecord.credentialID,
        deviceName: newCredRecord.deviceName,
      },
    });
  } catch (err: any) {
    console.error('[WebAuthn] Registration verify error:', err);
    return res.status(400).json({
      success: false,
      error: err.message || 'Biometric credential verification failed.',
    });
  }
});

// POST /api/auth/webauthn/authenticate/options - Start Fingerprint / Face Unlock assertion
router.post('/authenticate/options', async (req: Request, res: Response) => {
  try {
    cleanupExpiredChallenges();
    const { rpID, origin } = getWebAuthnRpConfig(req);
    let { userId, username } = req.body as { userId?: string; username?: string };

    // Also resolve userId from existing HttpOnly session cookie if not explicitly provided
    if (!userId && !username) {
      const token = extractTokenFromRequest(req);
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
          userId = decoded.id;
        } catch {
          // Ignore expired token
        }
      }
    }

    if (!userId && !username) {
      return res.status(400).json({
        success: false,
        error: 'Account identifier required for biometric unlock.',
      });
    }

    const userDoc: any = await findUserByIdentifier({ userId, username });
    if (!userDoc || !userDoc.isActive) {
      return res.status(404).json({ success: false, error: 'Active account not found.' });
    }

    const creds: Array<IWebAuthnCredential | RuntimeWebAuthnCredential> =
      userDoc.webauthnCredentials || [];
    if (creds.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No biometric credentials enrolled for this account.',
      });
    }

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'required',
      allowCredentials: creds.map((cred) => ({
        id: cred.credentialID,
        transports: (cred.transports || ['internal']) as AuthenticatorTransport[],
      })),
      timeout: 60000,
    });

    challengeStore.set(`auth:${userDoc.id}`, {
      challenge: options.challenge,
      userId: userDoc.id,
      rpID,
      origin,
      expiresAt: Date.now() + CHALLENGE_TTL_MS,
    });

    return res.json({
      success: true,
      data: {
        userId: userDoc.id,
        options,
      },
    });
  } catch (err: any) {
    console.error('[WebAuthn] Auth options error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to prepare biometric verification.',
    });
  }
});

// POST /api/auth/webauthn/authenticate/verify - Verify Fingerprint / Face Unlock and refresh persistent session
router.post('/authenticate/verify', async (req: Request, res: Response) => {
  try {
    const { userId, response } = req.body as {
      userId?: string;
      response?: AuthenticationResponseJSON;
    };

    if (!userId || !response || !response.id) {
      return res.status(400).json({ success: false, error: 'Missing biometric assertion data.' });
    }

    const pending = challengeStore.get(`auth:${userId}`);
    if (!pending || pending.expiresAt < Date.now()) {
      challengeStore.delete(`auth:${userId}`);
      return res.status(400).json({
        success: false,
        error: 'Biometric unlock session expired. Please retry.',
      });
    }

    const userDoc: any = await findUserByIdentifier({ userId });
    if (!userDoc || !userDoc.isActive) {
      return res.status(401).json({ success: false, error: 'Account unavailable or deactivated.' });
    }

    const creds: Array<IWebAuthnCredential | RuntimeWebAuthnCredential> =
      userDoc.webauthnCredentials || [];
    const matchedCred = creds.find((c) => c.credentialID === response.id);

    if (!matchedCred) {
      return res.status(401).json({
        success: false,
        error: 'Biometric passkey not recognized for this account.',
      });
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: pending.challenge,
      expectedOrigin: pending.origin,
      expectedRPID: pending.rpID,
      requireUserVerification: true,
      credential: {
        id: matchedCred.credentialID,
        publicKey: base64UrlToUint8(matchedCred.publicKey),
        counter: matchedCred.counter,
        transports: (matchedCred.transports || ['internal']) as AuthenticatorTransport[],
      },
    });

    challengeStore.delete(`auth:${userId}`);

    if (!verification.verified) {
      return res.status(401).json({
        success: false,
        error: 'Biometric authentication could not be verified.',
      });
    }

    const newCounter = verification.authenticationInfo.newCounter;

    if (isMongoReady()) {
      const mongoUser = await User.findOne({ id: userDoc.id });
      if (mongoUser) {
        const credRef = (mongoUser.webauthnCredentials || []).find(
          (c) => c.credentialID === matchedCred.credentialID
        );
        if (credRef) {
          credRef.counter = newCounter;
          credRef.lastUsedAt = new Date();
        }
        mongoUser.lastLoginAt = new Date();
        await mongoUser.save();
        await logAuditEvent(
          'WEBAUTHN_LOGIN',
          mongoUser,
          'User',
          mongoUser.id,
          { credentialID: matchedCred.credentialID },
          req.ip
        );
      }
    } else {
      const db = getRuntimeDb();
      const rtUser = db.users.find((u) => u.id === userDoc.id);
      if (rtUser) {
        const credRef = (rtUser.webauthnCredentials || []).find(
          (c) => c.credentialID === matchedCred.credentialID
        );
        if (credRef) {
          credRef.counter = newCounter;
          credRef.lastUsedAt = new Date().toISOString();
        }
        rtUser.lastLoginAt = new Date().toISOString();
        saveRuntimeDb(db);
      }
    }

    const effectiveClassIds = await resolveEffectiveAssignedClassIds(userDoc);
    const token = generateToken({
      id: userDoc.id,
      role: userDoc.role,
      username: userDoc.username,
      fullName: userDoc.fullName,
      campusId: userDoc.campusId,
      studentId: userDoc.studentId,
      linkedStudentIds: userDoc.linkedStudentIds || [],
      assignedClassIds: effectiveClassIds,
    });

    setSessionCookie(res, token, req);

    const sanitizedUser = isMongoReady()
      ? {
          id: userDoc.id,
          role: userDoc.role,
          fullName: userDoc.fullName,
          arabicName: userDoc.arabicName,
          username: userDoc.username,
          email: userDoc.email,
          phone: userDoc.phone,
          avatar: userDoc.avatar,
          title: userDoc.title,
          referenceId: userDoc.referenceId,
          campusId: userDoc.campusId,
          studentId: userDoc.studentId,
          linkedStudentIds: userDoc.linkedStudentIds,
          assignedClassIds: effectiveClassIds,
          mustChangePassword: Boolean(userDoc.mustChangePassword),
          biometricEnabled: true,
        }
      : {
          ...sanitizeRuntimeUser(userDoc),
          assignedClassIds: effectiveClassIds,
          biometricEnabled: true,
        };

    return res.json({
      success: true,
      token,
      user: sanitizedUser,
    });
  } catch (err: any) {
    console.error('[WebAuthn] Auth verify error:', err);
    return res.status(401).json({
      success: false,
      error: err.message || 'Biometric unlock failed.',
    });
  }
});

// DELETE /api/auth/webauthn/credentials/:credentialId - Remove an enrolled biometric device
router.delete('/credentials/:credentialId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const reqUser = req.user!;
    const credentialId = req.params.credentialId;

    if (isMongoReady()) {
      const userDoc = await User.findOne({ id: reqUser.id });
      if (userDoc) {
        userDoc.webauthnCredentials = (userDoc.webauthnCredentials || []).filter(
          (c) => c.credentialID !== credentialId
        );
        await userDoc.save();
      }
    } else {
      const db = getRuntimeDb();
      const rtUser = db.users.find((u) => u.id === reqUser.id);
      if (rtUser) {
        rtUser.webauthnCredentials = (rtUser.webauthnCredentials || []).filter(
          (c) => c.credentialID !== credentialId
        );
        saveRuntimeDb(db);
      }
    }

    return res.json({ success: true, message: 'Biometric credential removed.' });
  } catch (err: any) {
    console.error('[WebAuthn] Delete credential error:', err);
    return res.status(500).json({ success: false, error: 'Failed to remove biometric credential.' });
  }
});

export default router;
