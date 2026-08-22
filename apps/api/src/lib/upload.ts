/**
 * File-upload stub for profile pictures / attachments.
 *
 * DEVIATION (noted in the S05 log): no object storage or `multer` dependency is
 * wired in this environment (offline install is blocked), so the profile-picture
 * endpoint accepts a JSON `{ url }` body instead of `multipart/form-data`. The
 * contract shape (`{ profilePictureUrl }`) is unchanged, so S13 can swap to a
 * real multipart upload later without a contract break. This helper centralises
 * the "given some input, return a stored URL" seam a real storage adapter would
 * implement.
 */
import { z } from 'zod';

/** Body accepted by the profile-picture endpoint in the URL-stub mode. */
export const ProfilePictureUrlSchema = z.object({ url: z.string().url() }).strict();
export type ProfilePictureUrlInput = z.infer<typeof ProfilePictureUrlSchema>;

/**
 * Resolve the stored URL for an uploaded picture. In the stub this is the
 * caller-supplied URL verbatim; a real adapter would persist bytes and return
 * the resulting object URL.
 *
 * @param input - The validated `{ url }` body.
 * @returns The URL to persist on `Employee.profilePicture`.
 */
export function resolveProfilePictureUrl(input: ProfilePictureUrlInput): string {
  return input.url;
}
