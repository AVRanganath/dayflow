'use client';

import React, { useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { initials as getInitials, getAvatarColor } from '../../lib/format';

import type { WorkStatus } from '@dayflow/shared';
import { WorkStatusBadge } from './WorkStatusBadge';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  name?: string;
  src?: string | null;
  size?: AvatarSize;
  color?: string;
  className?: string;
  workStatus?: WorkStatus | string | null;
}

/**
 * Reusable circular Avatar primitive with initials fallback, deterministic color palette,
 * and optional ADR-017 work status indicator (🟢/🟡/✈️).
 */
export function Avatar({
  name = 'User',
  src,
  size = 'md',
  color,
  className,
  workStatus,
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

  const avatarContent = (
    <div
      style={{ backgroundColor: !showImage ? bgColor : undefined }}
      className={twMerge(
        clsx(
          'relative inline-flex flex-shrink-0 items-center justify-center rounded-full overflow-hidden select-none font-semibold text-white shadow-sm',
          sizeConfig.container,
          !workStatus && className,
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

  if (!workStatus) {
    return avatarContent;
  }

  const badgeSize = size === 'xs' ? 'sm' : size === 'sm' || size === 'md' ? 'md' : 'lg';

  return (
    <div className={twMerge(clsx('relative inline-flex flex-shrink-0', className))}>
      {avatarContent}
      <div className="absolute -bottom-0.5 -right-0.5 z-10 rounded-full bg-card p-[1px]">
        <WorkStatusBadge status={workStatus} size={badgeSize} />
      </div>
    </div>
  );
}

export default Avatar;
