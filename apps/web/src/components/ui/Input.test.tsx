import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  it('renders input correctly', () => {
    render(<Input placeholder="Type here" />);
    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
  });

  it('renders label and handles required asterisk', () => {
    render(<Input label="Email" required id="email-input" />);
    const label = screen.getByText('Email');
    expect(label).toBeInTheDocument();
    expect(label.innerHTML).toContain('*');
    
    // Check association
    const input = screen.getByLabelText(/Email/);
    expect(input).toBeInTheDocument();
  });

  it('renders helper text when no error', () => {
    render(<Input helperText="Please enter your email" />);
    expect(screen.getByText('Please enter your email')).toBeInTheDocument();
  });

  it('renders error message and applies error class', () => {
    const { container } = render(<Input error="Invalid email address" helperText="Helper text" />);
    expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    expect(screen.getByText('Invalid email address')).toHaveClass('text-danger');
    
    // Helper text shouldn't show if there's an error message
    expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
    
    const input = container.querySelector('input');
    expect(input).toHaveClass('border-danger');
  });

  it('renders icons correctly', () => {
    render(
      <Input
        leftIcon={<span data-testid="left-icon">L</span>}
        rightIcon={<span data-testid="right-icon">R</span>}
      />
    );
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('handles user input', () => {
    render(<Input label="Name" id="name" />);
    const input = screen.getByLabelText('Name') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'John' } });
    expect(input.value).toBe('John');
  });

  it('is disabled correctly', () => {
    render(<Input label="Name" disabled />);
    const input = screen.getByLabelText('Name');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('cursor-not-allowed');
  });
});
