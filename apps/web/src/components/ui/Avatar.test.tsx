import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('renders initials when no src is provided', () => {
    render(<Avatar name="John Doe" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders image when src is provided', () => {
    render(<Avatar name="John Doe" src="https://example.com/avatar.jpg" />);
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    // Initials should not be present
    expect(screen.queryByText('JD')).not.toBeInTheDocument();
  });

  it('falls back to initials if image fails to load', () => {
    render(<Avatar name="Jane Smith" src="invalid-url" />);
    const img = screen.getByRole('img');
    fireEvent.error(img); // simulate load error
    
    // Image should be gone
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    // Initials should appear
    expect(screen.getByText('JS')).toBeInTheDocument();
  });

  it('applies custom background color if provided', () => {
    const { container } = render(<Avatar name="John" color="#ff0000" />);
    // Check if style includes the color, happy-dom might preserve hex
    expect(container.firstChild).toHaveStyle({ backgroundColor: '#ff0000' });
  });

  it('applies size classes correctly', () => {
    const { container } = render(<Avatar name="John" size="lg" />);
    expect(container.firstChild).toHaveClass('h-12', 'w-12');
  });
});
