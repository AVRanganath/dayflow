'use client';

import React, { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { Avatar, useToast } from '../../../../components/ui';
import { ApiError } from '../../../../lib/api/types';
import { uploadProfilePicture } from '../../../../lib/employees';

/**
 * Camera-overlay profile-picture uploader (PAGE 5): a 120px avatar with a camera
 * button that picks and previews an image, then uploads it via
 * `PATCH /employees/:id/profile-picture` (`:id` = the current user's employee id).
 * Optimistic preview + a success toast; the returned `profilePictureUrl` is
 * bubbled up so the header stays in sync.
 */
export interface AvatarUploadProps {
  /** Internal employee id (used as `:id` in the endpoint). */
  employeeId: string;
  name: string;
  src?: string | null;
  /** Called with the stored URL after a successful upload. */
  onUploaded: (url: string) => void;
}

export function AvatarUpload({ employeeId, name, src, onUploaded }: AvatarUploadProps) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset the input so picking the same file again re-triggers change.
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.', 'Unsupported file');
      return;
    }

    // Optimistic local preview.
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);
    try {
      const url = await uploadProfilePicture(employeeId, file);
      onUploaded(url);
      toast.success('Profile picture updated.', 'Saved');
    } catch (err) {
      setPreview(null);
      const message = err instanceof ApiError ? err.message : 'Could not upload the picture';
      toast.error(message, 'Upload failed');
    } finally {
      setUploading(false);
      URL.revokeObjectURL(localUrl);
    }
  }

  return (
    <div className="relative flex-shrink-0">
      <Avatar name={name} src={preview ?? src} size="xl" className="h-[120px] w-[120px] text-4xl" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Upload profile picture"
        className="absolute bottom-0.5 right-0.5 inline-flex h-[34px] w-[34px] items-center justify-center rounded-full border border-border bg-card text-text-secondary shadow-card-hover transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
      >
        {uploading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

export default AvatarUpload;
