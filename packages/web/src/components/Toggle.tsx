/**
 * Simple Toggle component for boolean values
 */
import { forwardRef } from 'react';

interface ToggleProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
  children?: React.ReactNode;
}

const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ id, checked, onChange, disabled = false, 'aria-label': ariaLabel, children, ...props }, ref) => {
    return (
      <label htmlFor={id} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
        <input
          ref={ref}
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={ariaLabel}
          style={{ marginRight: 8 }}
          {...props}
        />
        {children}
      </label>
    );
  }
);

Toggle.displayName = 'Toggle';

export default Toggle;