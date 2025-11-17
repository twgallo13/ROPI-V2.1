/**
 * DescriptionPanel component tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DescriptionPanel from '../components/ProductEditorV2/DescriptionPanel';
import * as describeService from '../services/describe';
import type { DescribeProductResponse } from '../services/describe';

// Mock the describe service
vi.mock('../services/describe', () => ({
  describeProduct: vi.fn(),
}));

describe('DescriptionPanel', () => {
  const mockProductId = 'TEST-PRODUCT-123';
  const mockProductData = {
    name: 'Test Running Shoe',
    category: 'Footwear',
    status: 'active',
    sku_core: {
      name: 'Test Running Shoe',
      brand: 'Nike',
      mpn: 'ABC123',
      department: 'Athletic',
      class: 'Running',
      category: 'Shoes',
    },
    descriptive: {
      gender: "Men's",
      age_group: 'Adult',
      materials: ['Mesh', 'Rubber'],
      material: 'Mesh',
      primary_color: 'Black',
      descriptive_color: 'Midnight Black',
      cut_type: 'Low Top',
      closure_type: 'Lace Up',
      heel_height: 'Low',
      platform_height: 'Standard',
      sports_team: null,
      league: null,
      style_id: 'RUN-001',
      family_sizing: false,
    },
    pricing: {
      retail_price: 129.99,
    },
    availability: {
      launch_date: '2025-01-15',
    },
    websites: ['nike.com', 'footlocker.com'],
  };

  const mockDescribeResponse: DescribeProductResponse = {
    description: 'This is a test AI-generated description for the running shoe.',
    blocks: {
      intro: '<p>Experience premium comfort with the Test Running Shoe.</p>',
      features: '<p>Breathable mesh upper with rubber outsole for durability.</p>',
      benefits: '<p>Perfect for daily training and casual wear.</p>',
    },
    scores: {
      overall: 8.5,
      factual: 9.0,
      tone: 8.0,
      seo: 8.5,
      clarity: 9.0,
    },
    coach: {
      reasons: ['Strong product attributes', 'Clear messaging'],
      actions: ['Consider adding more technical specs'],
      next_questions: ['What is the shoe weight?'],
    },
    seo: {
      meta_title: 'Test Running Shoe - Nike | Premium Athletic Footwear',
      meta_description: 'Shop the Test Running Shoe by Nike. Breathable mesh design with superior comfort.',
      meta_keywords: ['running shoes', 'Nike', 'athletic footwear'],
    },
    facts_used: ['brand', 'materials', 'price'],
    used_template: {
      scope: 'footwear',
      key: 'athletic-shoe',
      version: '1.0',
      conditionsMatched: ['category:Shoes', 'department:Athletic'],
    },
  } as any;

  const mockOnDescriptionUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(describeService.describeProduct).mockResolvedValue(mockDescribeResponse);
  });

  it('renders DescriptionPanel without throwing and calls describeProduct with attributes from productData', async () => {
    render(
      <DescriptionPanel
        productId={mockProductId}
        productData={mockProductData}
        onDescriptionUpdate={mockOnDescriptionUpdate}
      />
    );

    // Wait for the component to call loadDescription on mount
    await waitFor(() => {
      expect(describeService.describeProduct).toHaveBeenCalledTimes(1);
    });

    // Verify describeProduct was called with correct attributes built from productData
    const callArgs = vi.mocked(describeService.describeProduct).mock.calls[0][0];
    
    expect(callArgs.productId).toBe(mockProductId);
    expect(callArgs.channel).toBe('RetailOps');
    expect(callArgs.tone).toBe('Clean');
    expect(callArgs.length).toBe('Medium');
    expect(callArgs.temperature).toBe(0.6);
    
    // Verify attributes were built from productData
    expect(callArgs.attributes).toBeDefined();
    expect(callArgs.attributes?.name).toBe('Test Running Shoe');
    expect(callArgs.attributes?.brand).toBe('Nike');
    expect(callArgs.attributes?.mpn).toBe('ABC123');
    expect(callArgs.attributes?.department).toBe('Athletic');
    expect(callArgs.attributes?.class).toBe('Running');
    expect(callArgs.attributes?.category).toBe('Shoes');
    expect(callArgs.attributes?.gender).toBe("Men's");
    expect(callArgs.attributes?.ageGroup).toBe('Adult');
    expect(callArgs.attributes?.materials).toEqual(['Mesh', 'Rubber']);
    expect(callArgs.attributes?.material).toBe('Mesh');
    expect(callArgs.attributes?.primaryColor).toBe('Black');
    expect(callArgs.attributes?.descriptiveColor).toBe('Midnight Black');
    expect(callArgs.attributes?.cutType).toBe('Low Top');
    expect(callArgs.attributes?.closureType).toBe('Lace Up');
    expect(callArgs.attributes?.heelHeight).toBe('Low');
    expect(callArgs.attributes?.platformHeight).toBe('Standard');
    expect(callArgs.attributes?.styleId).toBe('RUN-001');
    expect(callArgs.attributes?.launchDate).toBe('2025-01-15');
    expect(callArgs.attributes?.familySizing).toBe(false);
    expect(callArgs.attributes?.price).toBe(129.99);
    expect(callArgs.attributes?.status).toBe('active');
    expect(callArgs.attributes?.websites).toEqual(['nike.com', 'footlocker.com']);
  });

  it('renders blocks from AI response without throwing', async () => {
    render(
      <DescriptionPanel
        productId={mockProductId}
        productData={mockProductData}
        onDescriptionUpdate={mockOnDescriptionUpdate}
      />
    );

    // Wait for the AI response to be processed
    await waitFor(() => {
      expect(describeService.describeProduct).toHaveBeenCalled();
    });

    // Wait for blocks to render - check for actual block content
    await waitFor(() => {
      expect(screen.queryByText(/Experience premium comfort/i)).toBeInTheDocument();
    });

    // Verify blocks are rendered
    expect(screen.getByText(/Experience premium comfort/i)).toBeInTheDocument();
    expect(screen.getByText(/Breathable mesh upper/i)).toBeInTheDocument();
    expect(screen.getByText(/Perfect for daily training/i)).toBeInTheDocument();
  });

  it('triggers loadDescription when Generate button is clicked', async () => {
    render(
      <DescriptionPanel
        productId={mockProductId}
        productData={mockProductData}
        onDescriptionUpdate={mockOnDescriptionUpdate}
      />
    );

    // Wait for initial load
    await waitFor(() => {
      expect(describeService.describeProduct).toHaveBeenCalledTimes(1);
    });

    // Clear the mock to test the button click
    vi.clearAllMocks();
    vi.mocked(describeService.describeProduct).mockResolvedValue(mockDescribeResponse);

    // Find and click the Generate button
    const generateButton = screen.getByRole('button', { name: /generate|refresh|regenerate/i });
    fireEvent.click(generateButton);

    // Verify describeProduct was called again
    await waitFor(() => {
      expect(describeService.describeProduct).toHaveBeenCalledTimes(1);
    });

    // Verify attributes were still passed correctly
    const callArgs = vi.mocked(describeService.describeProduct).mock.calls[0][0];
    expect(callArgs.attributes?.name).toBe('Test Running Shoe');
    expect(callArgs.attributes?.brand).toBe('Nike');
  });
});
