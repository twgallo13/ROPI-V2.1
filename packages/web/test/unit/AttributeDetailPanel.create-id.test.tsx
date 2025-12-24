/**
 * LP-ATTR-1.3.3: Tests for editable Attribute ID on create with uniqueness validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AttributeDetailPanel from '../../src/components/AttributeDetailPanel';
import * as useAttributesModule from '../../src/hooks/useAttributes';
import type { Attribute } from '../../src/hooks/useAttributes';

// Mock the attributeIdExists function
vi.mock('../../src/hooks/useAttributes', async () => {
  const actual = await vi.importActual('../../src/hooks/useAttributes');
  return {
    ...actual,
    attributeIdExists: vi.fn(),
  };
});

const mockAttributes: Attribute[] = [
  {
    attribute_id: 'color',
    label: 'Color',
    data_type: 'string',
    status: 'active',
  } as Attribute,
];

describe('AttributeDetailPanel - LP-ATTR-1.3.3: Editable ID on Create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show editable ID field when creating new attribute (no attribute_id)', () => {
    const formData: Partial<Attribute> = {
      label: 'Test Attribute',
      data_type: 'string',
      status: 'active',
    };

    // Create a dummy attribute like AttributesConsole does
    const dummyAttribute = {
      attribute_id: 'new_attribute',
      ...formData,
    } as Attribute;

    render(
      <MemoryRouter>
        <AttributeDetailPanel
          attribute={dummyAttribute}
          attributes={mockAttributes}
          formData={formData}
          isDirty={false}
          saving={false}
          isCreating={true}
          onFormChange={vi.fn()}
          onCancel={vi.fn()}
          onSync={vi.fn()}
          onSave={vi.fn()}
        />
      </MemoryRouter>
    );

    const idInput = screen.getByTestId('form-id') as HTMLInputElement;
    expect(idInput).not.toBeDisabled();
    expect(idInput.placeholder).toContain('auto-generate');
  });

  it('should show read-only ID field when editing existing attribute', () => {
    const existingAttribute: Attribute = {
      attribute_id: 'color',
      label: 'Color',
      data_type: 'string',
      status: 'active',
    } as Attribute;

    const formData: Partial<Attribute> = {
      attribute_id: 'color',
      label: 'Color',
      data_type: 'string',
      status: 'active',
    };

    render(
      <MemoryRouter>
        <AttributeDetailPanel
          attribute={existingAttribute}
          attributes={mockAttributes}
          formData={formData}
          isDirty={false}
          saving={false}
          onFormChange={vi.fn()}
          onCancel={vi.fn()}
          onSync={vi.fn()}
          onSave={vi.fn()}
        />
      </MemoryRouter>
    );

    const idInput = screen.getByTestId('form-id') as HTMLInputElement;
    expect(idInput).toBeDisabled();
    expect(screen.getByText(/read-only after creation/i)).toBeInTheDocument();
  });

  it('should normalize ID input to snake_case', async () => {
    const formData: Partial<Attribute> = {
      label: 'Test Attribute',
      data_type: 'string',
      status: 'active',
    };

    const dummyAttribute = {
      attribute_id: 'new_attribute',
      ...formData,
    } as Attribute;

    const mockOnChange = vi.fn();

    render(
      <MemoryRouter>
        <AttributeDetailPanel
          attribute={dummyAttribute}
          attributes={mockAttributes}
          formData={formData}
          isDirty={false}
          saving={false}
          isCreating={true}
          onFormChange={mockOnChange}
          onCancel={vi.fn()}
          onSync={vi.fn()}
          onSave={vi.fn()}
        />
      </MemoryRouter>
    );

    const idInput = screen.getByTestId('form-id') as HTMLInputElement;
    
    // Type "Product Name" and expect "product_name"
    fireEvent.change(idInput, { target: { value: 'Product Name' } });
    
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          attribute_id: 'product_name',
        })
      );
    });
  });

  it('should prepend "attr_" if ID starts with a digit', async () => {
    const formData: Partial<Attribute> = {
      label: 'Test Attribute',
      data_type: 'string',
      status: 'active',
    };

    const dummyAttribute = {
      attribute_id: 'new_attribute',
      ...formData,
    } as Attribute;

    const mockOnChange = vi.fn();

    render(
      <MemoryRouter>
        <AttributeDetailPanel
          attribute={dummyAttribute}
          attributes={mockAttributes}
          formData={formData}
          isDirty={false}
          saving={false}
          isCreating={true}
          onFormChange={mockOnChange}
          onCancel={vi.fn()}
          onSync={vi.fn()}
          onSave={vi.fn()}
        />
      </MemoryRouter>
    );

    const idInput = screen.getByTestId('form-id') as HTMLInputElement;
    
    // Type "123abc" and expect "attr_123abc"
    fireEvent.change(idInput, { target: { value: '123abc' } });
    
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          attribute_id: 'attr_123abc',
        })
      );
    });
  });

  it('should check ID uniqueness on blur and show error if duplicate', async () => {
    // Mock attributeIdExists to return true (ID exists)
    vi.mocked(useAttributesModule.attributeIdExists).mockResolvedValue(true);

    const formData: Partial<Attribute> = {
      attribute_id: 'existing_id',
      label: 'Test Attribute',
      data_type: 'string',
      status: 'active',
    };

    const dummyAttribute = {
      ...formData,
    } as Attribute;

    render(
      <MemoryRouter>
        <AttributeDetailPanel
          attribute={dummyAttribute}
          attributes={mockAttributes}
          formData={formData}
          isDirty={false}
          saving={false}
          isCreating={true}
          onFormChange={vi.fn()}
          onCancel={vi.fn()}
          onSync={vi.fn()}
          onSave={vi.fn()}
        />
      </MemoryRouter>
    );

    const idInput = screen.getByTestId('form-id') as HTMLInputElement;
    
    // Trigger blur to check uniqueness
    fireEvent.blur(idInput);
    
    await waitFor(() => {
      expect(useAttributesModule.attributeIdExists).toHaveBeenCalledWith('existing_id');
      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });
  });

  it('should not show error if ID is unique', async () => {
    // Mock attributeIdExists to return false (ID is unique)
    vi.mocked(useAttributesModule.attributeIdExists).mockResolvedValue(false);

    const formData: Partial<Attribute> = {
      attribute_id: 'unique_id',
      label: 'Test Attribute',
      data_type: 'string',
      status: 'active',
    };

    const dummyAttribute = {
      ...formData,
    } as Attribute;

    render(
      <MemoryRouter>
        <AttributeDetailPanel
          attribute={dummyAttribute}
          attributes={mockAttributes}
          formData={formData}
          isDirty={false}
          saving={false}
          isCreating={true}
          onFormChange={vi.fn()}
          onCancel={vi.fn()}
          onSync={vi.fn()}
          onSave={vi.fn()}
        />
      </MemoryRouter>
    );

    const idInput = screen.getByTestId('form-id') as HTMLInputElement;
    
    // Trigger blur to check uniqueness
    fireEvent.blur(idInput);
    
    await waitFor(() => {
      expect(useAttributesModule.attributeIdExists).toHaveBeenCalledWith('unique_id');
    });

    // Should not show error message
    expect(screen.queryByText(/already exists/i)).not.toBeInTheDocument();
  });

  it('should clear error message when user types in ID field', async () => {
    // Mock attributeIdExists to return true initially
    vi.mocked(useAttributesModule.attributeIdExists).mockResolvedValue(true);

    const formData: Partial<Attribute> = {
      attribute_id: 'existing_id',
      label: 'Test Attribute',
      data_type: 'string',
      status: 'active',
    };

    const dummyAttribute = {
      ...formData,
    } as Attribute;

    const mockOnChange = vi.fn((newData) => {
      formData.attribute_id = newData.attribute_id;
    });

    const { rerender } = render(
      <MemoryRouter>
        <AttributeDetailPanel
          attribute={dummyAttribute}
          attributes={mockAttributes}
          formData={formData}
          isDirty={false}
          saving={false}
          isCreating={true}
          onFormChange={mockOnChange}
          onCancel={vi.fn()}
          onSync={vi.fn()}
          onSave={vi.fn()}
        />
      </MemoryRouter>
    );

    const idInput = screen.getByTestId('form-id') as HTMLInputElement;
    
    // Trigger blur to show error
    fireEvent.blur(idInput);
    
    await waitFor(() => {
      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });

    // Now type in the field - error should clear
    fireEvent.change(idInput, { target: { value: 'new_id' } });
    
    // Re-render with updated formData
    const updatedFormData = { ...formData, attribute_id: 'new_id' };
    rerender(
      <MemoryRouter>
        <AttributeDetailPanel
          attribute={{ ...dummyAttribute, attribute_id: 'new_id' } as Attribute}
          attributes={mockAttributes}
          formData={updatedFormData}
          isDirty={false}
          saving={false}
          isCreating={true}
          onFormChange={mockOnChange}
          onCancel={vi.fn()}
          onSync={vi.fn()}
          onSave={vi.fn()}
        />
      </MemoryRouter>
    );

    // Error should be cleared (though we may need to wait for re-render)
    await waitFor(() => {
      expect(screen.queryByText(/already exists/i)).not.toBeInTheDocument();
    });
  });
});
