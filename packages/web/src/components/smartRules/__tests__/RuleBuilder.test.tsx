/**
 * RuleBuilder Component Tests
 * LP-smart-rules-admin-1.0.0: Admin Settings Smart Rules Manager
 * 
 * Unit tests for the IFTTT Rule Builder component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RuleBuilder } from '../RuleBuilder';

// Mock the smart rules admin service
vi.mock('../../../services/smartRulesAdmin', () => ({
  getExportableAttributes: vi.fn(() => Promise.resolve([
    { id: 'attributes.gender', label: 'Gender', group: 'Standard' },
    { id: 'attributes.brand', label: 'Brand', group: 'Exportable' },
    { id: 'attributes.color', label: 'Color', group: 'Exportable' },
    { id: 'attributes.size', label: 'Size', group: 'Standard' },
  ])),
  generateRuleId: vi.fn(() => 'rule_test_123'),
}));

describe('RuleBuilder Component', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Rendering', () => {
    it('should render the rule builder form', () => {
      render(
        <RuleBuilder 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      );
      
      expect(screen.getByText('Rule Name *')).toBeInTheDocument();
      expect(screen.getByText(/IF/)).toBeInTheDocument();
      expect(screen.getByText(/THEN/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Rule/i })).toBeInTheDocument();
    });
    
    it('should render with initial values when editing', () => {
      const initialValue = {
        ruleId: 'rule_existing',
        name: 'Existing Rule',
        description: 'Test description',
        enabled: true,
        priority: 500,
        conditions: [{
          id: 'cond_1',
          field: 'rics_category_path',
          matchType: 'contains' as const,
          value: 'Women',
        }],
        conditionLogic: 'and' as const,
        action: {
          targetField: 'attributes.gender',
          valueTemplate: "Women's",
          setOnlyIfEmpty: true,
        },
        autoApply: false,
        autoApplyConfidence: 0.9,
        tags: ['test'],
      };
      
      render(
        <RuleBuilder 
          initialValue={initialValue}
          onSave={mockOnSave} 
          onCancel={mockOnCancel}
          isEditing 
        />
      );
      
      expect(screen.getByDisplayValue('Existing Rule')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
    });
  });
  
  describe('Form Validation', () => {
    it('should show error when name is empty', async () => {
      render(
        <RuleBuilder 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      );
      
      const createButton = screen.getByRole('button', { name: /Create Rule/i });
      await userEvent.click(createButton);
      
      expect(screen.getByText(/Rule name is required/i)).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });
    
    it('should show error when target field is empty', async () => {
      render(
        <RuleBuilder 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      );
      
      // Fill in name by finding the input
      const nameInput = screen.getByPlaceholderText(/Women's Category Gender Rule/i);
      await userEvent.type(nameInput, 'Test Rule');
      
      const createButton = screen.getByRole('button', { name: /Create Rule/i });
      await userEvent.click(createButton);
      
      expect(screen.getByText(/Target field is required/i)).toBeInTheDocument();
    });
  });
  
  describe('Condition Management', () => {
    it('should add a new condition when clicking Add Condition', async () => {
      render(
        <RuleBuilder 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      );
      
      // Find all Field labels initially
      const initialFieldLabels = screen.getAllByText('Field');
      
      const addButton = screen.getByRole('button', { name: /Add Condition/i });
      await userEvent.click(addButton);
      
      // Wait for state update
      await waitFor(() => {
        const fieldLabels = screen.getAllByText('Field');
        expect(fieldLabels.length).toBeGreaterThan(initialFieldLabels.length);
      });
    });
    
    it('should show logic toggle when multiple conditions exist', async () => {
      render(
        <RuleBuilder 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      );
      
      // Add second condition
      const addButton = screen.getByRole('button', { name: /Add Condition/i });
      await userEvent.click(addButton);
      
      // Logic toggle should appear
      await waitFor(() => {
        expect(screen.getByText(/ALL \(AND\)/i)).toBeInTheDocument();
        expect(screen.getByText(/ANY \(OR\)/i)).toBeInTheDocument();
      });
    });
  });
  
  describe('Tags', () => {
    it('should add a tag when pressing Enter', async () => {
      render(
        <RuleBuilder 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      );
      
      const tagInput = screen.getByPlaceholderText(/Add tag/i);
      await userEvent.type(tagInput, 'test-tag{enter}');
      
      await waitFor(() => {
        expect(screen.getByText('test-tag')).toBeInTheDocument();
      });
    });
  });
  
  describe('Cancel Action', () => {
    it('should call onCancel when Cancel is clicked', async () => {
      render(
        <RuleBuilder 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      );
      
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await userEvent.click(cancelButton);
      
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });
});
