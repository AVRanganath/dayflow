'use client';

import React, { useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { initials as getInitials, getAvatarColor } from '../../lib/format';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  name?: string;
  src?: string | null;
  size?: AvatarSize;
  color?: string;
  className?: string;
}

/**
 * Reusable circular Avatar primitive with initials fallback and deterministic color palette.
 */
export function Avatar({
  name = 'User',
  src,
  size = 'md',
  color,
  className,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const sizeMap: Record<AvatarSize, { container: string; text: string }> = {
    xs: { container: 'h-6 w-6', text: 'text-[10px]' },
    sm: { container: 'h-8 w-8', text: 'text-xs' },
    md: { container: 'h-9 w-9', text: 'text-[13px]' },
    lg: { container: 'h-12 w-12', text: 'text-base font-bold' },
    xl: { container: 'h-28 w-28', text: 'text-3xl font-extrabold' },
  };

  const bgColor = color || getAvatarColor(name);
  const initialsText = getInitials(name);
  const sizeConfig = sizeMap[size] || sizeMap.md;

  const showImage = src && !imgError;

  return (
    <div
      style={{ backgroundColor: !showImage ? bgColor : undefined }}
      className={twMerge(
        clsx(
          'relative inline-flex flex-shrink-0 items-center justify-center rounded-full overflow-hidden select-none font-semibold text-white shadow-sm',
          sizeConfig.container,
          className,
        ),
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className={clsx('tracking-wider', sizeConfig.text)}>{initialsText}</span>
      )}
    </div>
  );
}

export default Avatar;
