import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles clicks', () => {
    let clicked = false;
    render(<Button onClick={() => clicked = true}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(clicked).toBe(true);
  });

  it('is disabled when disabled prop is true', () => {
    let clicked = false;
    render(<Button disabled onClick={() => clicked = true}>Click me</Button>);
    const button = screen.getByText('Click me');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(clicked).toBe(false);
  });

  it('is disabled and shows spinner when isLoading is true', () => {
    let clicked = false;
    // We render children but they should be next to the spinner
    render(<Button isLoading onClick={() => clicked = true}>Loading</Button>);
    const button = screen.getByText('Loading');
    expect(button).toBeDisabled();
    
    // Spinner element checking (it has animate-spin class)
    const spinner = button.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();

    fireEvent.click(button);
    expect(clicked).toBe(false);
  });

  it('renders icons correctly', () => {
    render(
      <Button
        leftIcon={<span data-testid="left-icon">L</span>}
        rightIcon={<span data-testid="right-icon">R</span>}
      >
        With Icons
      </Button>
    );

    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('applies variant classes correctly', () => {
    const { container } = render(<Button variant="danger">Danger</Button>);
    expect(container.firstChild).toHaveClass('bg-danger');
  });

  it('applies size classes correctly', () => {
    const { container } = render(<Button size="lg">Large</Button>);
    expect(container.firstChild).toHaveClass('h-11');
  });
});
