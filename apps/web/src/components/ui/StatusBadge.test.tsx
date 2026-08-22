import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders children and variant class correctly', () => {
    const { container } = render(<StatusBadge variant="success">Active</StatusBadge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
    // success variant has text-[#065F46]
    expect(container.firstChild).toHaveClass('text-[#065F46]');
  });

  it('resolves status to variant and label correctly', () => {
    render(<StatusBadge status="APPROVED" />);
    const badge = screen.getByText('Approved');
    expect(badge).toBeInTheDocument();
    // APPROVED mapped to success
    expect(badge).toHaveClass('text-[#065F46]'); // Success color
  });

  it('formats unknown status as neutral', () => {
    render(<StatusBadge status="UNKNOWN_STATE" />);
    const badge = screen.getByText('Unknown State');
    expect(badge).toBeInTheDocument();
    // Neutral color
    expect(badge).toHaveClass('text-[#6C757D]');
  });

  it('renders dot when dot is true', () => {
    const { container } = render(<StatusBadge status="ACTIVE" dot />);
    // The dot is a sibling to the text, inside the main span
    const dotSpan = container.querySelector('.rounded-full');
    expect(dotSpan).toBeInTheDocument();
    expect(dotSpan).toHaveClass('h-1.5', 'w-1.5');
  });

  it('overrides resolved variant if explicitly provided', () => {
    // "APPROVED" would normally be success, but we force danger
    const { container } = render(<StatusBadge status="APPROVED" variant="danger" />);
    const badge = screen.getByText('Approved');
    expect(badge).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('text-[#B91C1C]'); // Danger color
  });
});
