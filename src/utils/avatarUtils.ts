export const DEFAULT_STUDENT_AVATAR = '/assets/aistudio/image_575dc2d2.png';

/**
 * Resolves a student profile photo URL.
 * When no photo has been uploaded (or if it is the legacy default placeholder),
 * falls back to the standard circular grey silhouette placeholder icon.
 */
export function getStudentPhotoSrc(photo?: string | null): string {
  const trimmed = (photo || '').trim();
  if (!trimmed) {
    return DEFAULT_STUDENT_AVATAR;
  }
  return trimmed;
}
