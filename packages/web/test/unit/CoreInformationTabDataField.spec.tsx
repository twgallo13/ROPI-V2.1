/**
 * CoreInformationTab data-field Attribute Tests
 * 
 * Tests that all product-level inputs have proper data-field and name attributes
 * for scroll-to-field navigation (LP-1.0.2)
 * 
 * Lisa LP-1.0.2
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CoreInformationTab from '../../src/components/product/CoreInformationTab';

const mockProduct = {
  id: 'test-product',
  sku: 'TEST-SKU',
  styleId: 'STYLE-001',
  name: 'Test Product',
  brand: 'Test Brand',
  category: 'Shoes',
  department: 'Men',
  subcategory: 'Sneakers',
  firstReceived: '2025-01-01',
  launchDate: '2025-02-01',
  launchStatus: 'scheduled',
  websites: ['shiekh.com'],
  attributes: {},
  skuConfidence: 1,
  exportReady: true,
  created: '2025-01-01T00:00:00Z',
  updated: '2025-01-15T00:00:00Z',
};

describe('CoreInformationTab data-field attributes (LP-1.0.2)', () => {
  const renderTab = () => {
    return render(
      <BrowserRouter>
        <CoreInformationTab product={mockProduct as any} onUpdate={vi.fn()} />
      </BrowserRouter>
    );
  };

  describe('Identification section', () => {
    it('SKU input has correct data-field and name attributes', () => {
      renderTab();
      
      const input = document.querySelector('[data-field="product.sku"]');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('name', 'product.sku');
      expect(input).toHaveValue('TEST-SKU');
    });

    it('Style ID input has correct data-field and name attributes', () => {
      renderTab();
      
      const input = document.querySelector('[data-field="product.styleId"]');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('name', 'product.styleId');
      expect(input).toHaveValue('STYLE-001');
    });

    it('Product Name input has correct data-field and name attributes', () => {
      renderTab();
      
      const input = document.querySelector('[data-field="product.name"]');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('name', 'product.name');
      expect(input).toHaveValue('Test Product');
    });
  });

  describe('Classification section', () => {
    it('Brand input has correct data-field and name attributes', () => {
      renderTab();
      
      const input = document.querySelector('[data-field="product.brand"]');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('name', 'product.brand');
      expect(input).toHaveValue('Test Brand');
    });

    it('Category input has correct data-field and name attributes', () => {
      renderTab();
      
      const input = document.querySelector('[data-field="product.category"]');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('name', 'product.category');
      expect(input).toHaveValue('Shoes');
    });

    it('Department select has correct data-field and name attributes', () => {
      renderTab();
      
      const select = document.querySelector('[data-field="product.department"]');
      expect(select).toBeInTheDocument();
      expect(select).toHaveAttribute('name', 'product.department');
      expect(select).toHaveValue('Men');
    });

    it('Subcategory input has correct data-field and name attributes', () => {
      renderTab();
      
      const input = document.querySelector('[data-field="product.subcategory"]');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('name', 'product.subcategory');
      expect(input).toHaveValue('Sneakers');
    });
  });

  describe('Lifecycle section', () => {
    it('First Received date input has correct data-field and name attributes', () => {
      renderTab();
      
      const input = document.querySelector('[data-field="product.firstReceived"]');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('name', 'product.firstReceived');
      expect(input).toHaveValue('2025-01-01');
    });

    it('Launch Date input has correct data-field and name attributes', () => {
      renderTab();
      
      const input = document.querySelector('[data-field="product.launchDate"]');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('name', 'product.launchDate');
      expect(input).toHaveValue('2025-02-01');
    });

    it('Launch Status select has correct data-field and name attributes', () => {
      renderTab();
      
      const select = document.querySelector('[data-field="product.launchStatus"]');
      expect(select).toBeInTheDocument();
      expect(select).toHaveAttribute('name', 'product.launchStatus');
      expect(select).toHaveValue('scheduled');
    });
  });

  describe('Website Assignment section', () => {
    it('Websites checkbox group has correct data-field attribute', () => {
      renderTab();
      
      const group = document.querySelector('[data-field="product.websites"]');
      expect(group).toBeInTheDocument();
    });

    it('Individual website checkboxes have name attributes', () => {
      renderTab();
      
      const checkbox1 = document.querySelector('[name="product.websites.shiekh.com"]');
      const checkbox2 = document.querySelector('[name="product.websites.shiekhshoes.com"]');
      const checkbox3 = document.querySelector('[name="product.websites.example.com"]');
      
      expect(checkbox1).toBeInTheDocument();
      expect(checkbox2).toBeInTheDocument();
      expect(checkbox3).toBeInTheDocument();
    });
  });

  describe('scroll-to-field compatibility', () => {
    it('all product fields can be queried by data-field selector', () => {
      renderTab();
      
      const productFields = [
        'product.sku',
        'product.styleId',
        'product.name',
        'product.brand',
        'product.category',
        'product.department',
        'product.subcategory',
        'product.firstReceived',
        'product.launchDate',
        'product.launchStatus',
        'product.websites',
      ];
      
      productFields.forEach((fieldKey) => {
        const element = document.querySelector(`[data-field="${fieldKey}"]`);
        expect(element).toBeInTheDocument();
      });
    });

    it('all inputs follow canonical key format: product.<field>', () => {
      renderTab();
      
      const productInputs = document.querySelectorAll('[data-field^="product."]');
      
      expect(productInputs.length).toBe(11); // 10 fields + 1 websites group
      
      productInputs.forEach((input) => {
        const dataField = input.getAttribute('data-field');
        
        // Verify format: product.<field>
        expect(dataField).toMatch(/^product\.[a-zA-Z]+$/);
      });
    });

    it('simulates handleScrollToField behavior', () => {
      renderTab();
      
      // Simulate how handleScrollToField finds elements
      // First try name, then data-field
      const findField = (fieldKey: string): Element | null => {
        return document.querySelector(`[name="${fieldKey}"]`) ||
               document.querySelector(`[data-field="${fieldKey}"]`);
      };
      
      expect(findField('product.sku')).toBeInTheDocument();
      expect(findField('product.brand')).toBeInTheDocument();
      expect(findField('product.launchDate')).toBeInTheDocument();
    });
  });
});
