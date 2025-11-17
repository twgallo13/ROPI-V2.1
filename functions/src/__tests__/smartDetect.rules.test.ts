/**
 * Smart Detect Rules Test - Verify enhanced rules with autoApply flags
 */

import { describe, it, expect } from 'vitest';
import { runSmartDetect } from '../smartDetect';

describe('runSmartDetect - Enhanced Rules with autoApply', () => {
  describe('Canonical Schema Product', () => {
    it('should generate all suggestions with correct confidences and autoApply flags', () => {
      const canonicalProduct = {
        sku_core: {
          mpn: 'TEST-CANONICAL-001',
          brand: '',
          name: '',
          department: '',
          class: '',
          category: '',
          styleId: 'TEST-CANONICAL-001',
        },
        descriptive: {
          ageGroup: '',
          gender: '',
          material: [],
          primaryColor: '',
          sportsTeam: '',
          league: '',
        },
        source: {
          rics: {
            category: 'M|FTW|BASKETBALL|YOUTH',
            longDescription: 'Premium leather basketball shoe with mesh panels and rubber sole. Features NBA Lakers team logo.',
            shortDescription: 'Youth Lakers Basketball Shoe',
            color: 'purple-gold',
            vendorStyleName: 'Nike NBA Lakers Youth',
          },
        },
      };

      const result = runSmartDetect(canonicalProduct);

      expect(result).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.length).toBeGreaterThan(0);

      // Rule 1: Department from RICS category → sku_core.department
      const deptSuggestion = result.suggestions.find(s => s.fieldPath === 'sku_core.department');
      expect(deptSuggestion).toBeDefined();
      expect(deptSuggestion?.suggestedValue).toBe('Footwear');
      expect(deptSuggestion?.confidence).toBe(0.95);
      expect(deptSuggestion?.autoApply).toBe(true);

      // Rule 2: Class from RICS category → sku_core.class
      const classSuggestion = result.suggestions.find(s => s.fieldPath === 'sku_core.class');
      expect(classSuggestion).toBeDefined();
      expect(classSuggestion?.suggestedValue).toBe('Athletic');
      expect(classSuggestion?.confidence).toBe(0.9);
      expect(classSuggestion?.autoApply).toBe(true);

      // Rule 3: Age Group from RICS category → descriptive.ageGroup
      const ageSuggestion = result.suggestions.find(s => s.fieldPath === 'descriptive.ageGroup');
      expect(ageSuggestion).toBeDefined();
      expect(ageSuggestion?.suggestedValue).toBe('Grade School');
      expect(ageSuggestion?.confidence).toBe(0.85);
      expect(ageSuggestion?.autoApply).toBe(false);

      // Rule 4: Gender from RICS category first letter → descriptive.gender
      const genderSuggestion = result.suggestions.find(s => s.fieldPath === 'descriptive.gender');
      expect(genderSuggestion).toBeDefined();
      expect(genderSuggestion?.suggestedValue).toBe("Men's");
      expect(genderSuggestion?.confidence).toBe(0.9);
      expect(genderSuggestion?.autoApply).toBe(true);

      // Rule 7: Primary Color from RICS color field → descriptive.primaryColor
      const colorSuggestion = result.suggestions.find(s => s.fieldPath === 'descriptive.primaryColor');
      expect(colorSuggestion).toBeDefined();
      expect(colorSuggestion?.suggestedValue).toBe('Purple Gold');
      expect(colorSuggestion?.confidence).toBe(0.95);
      expect(colorSuggestion?.autoApply).toBe(true);
      expect(colorSuggestion?.reason).toContain('RICS color field');

      // Rule 8: Product Name from RICS shortDescription → sku_core.name
      const nameSuggestion = result.suggestions.find(s => s.fieldPath === 'sku_core.name');
      expect(nameSuggestion).toBeDefined();
      expect(nameSuggestion?.suggestedValue).toBe('Youth Lakers Basketball Shoe');
      expect(nameSuggestion?.confidence).toBe(0.95);
      expect(nameSuggestion?.autoApply).toBe(true);

      // Rule 9: Materials from longDescription → descriptive.material
      const materialSuggestion = result.suggestions.find(s => s.fieldPath === 'descriptive.material');
      expect(materialSuggestion).toBeDefined();
      expect(Array.isArray(materialSuggestion?.suggestedValue)).toBe(true);
      const materials = materialSuggestion?.suggestedValue as string[];
      expect(materials).toContain('Leather');
      expect(materials).toContain('Mesh');
      expect(materials).toContain('Rubber');
      expect(materialSuggestion?.confidence).toBe(0.8);
      expect(materialSuggestion?.autoApply).toBe(false);

      // Rule 5: Sports Team from longDescription → descriptive.sportsTeam
      const teamSuggestion = result.suggestions.find(s => s.fieldPath === 'descriptive.sportsTeam');
      expect(teamSuggestion).toBeDefined();
      expect(teamSuggestion?.suggestedValue).toBe('Lakers');
      expect(teamSuggestion?.confidence).toBe(0.8);
      expect(teamSuggestion?.autoApply).toBe(false);

      // Rule 6: League from longDescription → descriptive.league
      const leagueSuggestion = result.suggestions.find(s => s.fieldPath === 'descriptive.league');
      expect(leagueSuggestion).toBeDefined();
      expect(leagueSuggestion?.suggestedValue).toBe('NBA');
      expect(leagueSuggestion?.confidence).toBe(0.85);
      expect(leagueSuggestion?.autoApply).toBe(false);
    });

    it('should use RICS color field when available (high confidence, autoApply: true)', () => {
      const productWithRicsColor = {
        sku_core: { mpn: 'TEST-002', name: 'Test Product' },
        descriptive: { primaryColor: '' },
        source: {
          rics: {
            category: 'M|FTW|CASUAL|ADULT',
            color: 'navy-blue',
            longDescription: 'A red and white shoe', // Different color in text
          },
        },
      };

      const result = runSmartDetect(productWithRicsColor);
      const colorSuggestion = result.suggestions.find(s => s.fieldPath === 'descriptive.primaryColor');

      expect(colorSuggestion).toBeDefined();
      expect(colorSuggestion?.suggestedValue).toBe('Navy Blue'); // From RICS color, not text
      expect(colorSuggestion?.confidence).toBe(0.95);
      expect(colorSuggestion?.autoApply).toBe(true);
    });

    it('should fall back to text color detection (lower confidence, autoApply: false)', () => {
      const productWithoutRicsColor = {
        sku_core: { mpn: 'TEST-003', name: 'Test Product' },
        descriptive: { primaryColor: '' },
        source: {
          rics: {
            category: 'M|FTW|CASUAL|ADULT',
            longDescription: 'A beautiful red leather shoe',
          },
        },
      };

      const result = runSmartDetect(productWithoutRicsColor);
      const colorSuggestion = result.suggestions.find(s => s.fieldPath === 'descriptive.primaryColor');

      expect(colorSuggestion).toBeDefined();
      expect(colorSuggestion?.suggestedValue).toBe('Red');
      expect(colorSuggestion?.confidence).toBe(0.7);
      expect(colorSuggestion?.autoApply).toBe(false);
    });
  });

  describe('Legacy Schema Product (Backward Compatibility)', () => {
    it('should generate same suggestions for legacy flat schema', () => {
      const legacyProduct = {
        mpn: 'TEST-LEGACY-001',
        brand: '',
        name: '',
        department: '',
        class: '',
        ageGroup: '',
        gender: '',
        material: [],
        primaryColor: '',
        sportsTeam: '',
        league: '',
        rics: {
          category: 'W|APP|RUNNING|ADULT',
          longDescription: 'Premium cotton running shirt with nfl Patriots logo.',
          shortDescription: 'Women\'s Patriots Running Shirt',
          color: 'navy-red',
        },
      };

      const result = runSmartDetect(legacyProduct);

      expect(result).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.length).toBeGreaterThan(0);

      // Should still generate canonical field paths
      const fieldPaths = result.suggestions.map(s => s.fieldPath);
      const hasCanonicalPaths = fieldPaths.some(path => 
        path.startsWith('sku_core.') || path.startsWith('descriptive.')
      );
      expect(hasCanonicalPaths).toBe(true);

      // Department suggestion
      const deptSuggestion = result.suggestions.find(s => s.fieldPath === 'sku_core.department');
      expect(deptSuggestion).toBeDefined();
      expect(deptSuggestion?.suggestedValue).toBe('Apparel');
      expect(deptSuggestion?.autoApply).toBe(true);

      // Gender suggestion (W -> Women's)
      const genderSuggestion = result.suggestions.find(s => s.fieldPath === 'descriptive.gender');
      expect(genderSuggestion).toBeDefined();
      expect(genderSuggestion?.suggestedValue).toBe("Women's");
      expect(genderSuggestion?.autoApply).toBe(true);

      // League suggestion
      const leagueSuggestion = result.suggestions.find(s => s.fieldPath === 'descriptive.league');
      expect(leagueSuggestion).toBeDefined();
      expect(leagueSuggestion?.suggestedValue).toBe('NFL');
      expect(leagueSuggestion?.autoApply).toBe(false);

      // Color from RICS field
      const colorSuggestion = result.suggestions.find(s => s.fieldPath === 'descriptive.primaryColor');
      expect(colorSuggestion).toBeDefined();
      expect(colorSuggestion?.confidence).toBe(0.95);
      expect(colorSuggestion?.autoApply).toBe(true);
    });
  });

  describe('autoApply Flag Logic', () => {
    it('should set autoApply: true for high-confidence structured data rules', () => {
      const product = {
        sku_core: { mpn: 'TEST-004', name: '', department: '', class: '' },
        descriptive: { gender: '', primaryColor: '' },
        source: {
          rics: {
            category: 'B|FTW|SNEAKERS|YOUTH',
            shortDescription: 'Boys Sneakers',
            color: 'red-black',
          },
        },
      };

      const result = runSmartDetect(product);

      // Department: autoApply true (structured, 0.95)
      const dept = result.suggestions.find(s => s.fieldPath === 'sku_core.department');
      expect(dept?.autoApply).toBe(true);

      // Class: autoApply true (structured, 0.9)
      const cls = result.suggestions.find(s => s.fieldPath === 'sku_core.class');
      expect(cls?.autoApply).toBe(true);

      // Gender: autoApply true (structured, 0.9)
      const gender = result.suggestions.find(s => s.fieldPath === 'descriptive.gender');
      expect(gender?.autoApply).toBe(true);
      expect(gender?.suggestedValue).toBe("Boys'");

      // Color from RICS field: autoApply true (structured, 0.95)
      const color = result.suggestions.find(s => s.fieldPath === 'descriptive.primaryColor');
      expect(color?.autoApply).toBe(true);

      // Product Name: autoApply true (structured, 0.95)
      const name = result.suggestions.find(s => s.fieldPath === 'sku_core.name');
      expect(name?.autoApply).toBe(true);
    });

    it('should set autoApply: false for lower-confidence text-based rules', () => {
      const product = {
        sku_core: { mpn: 'TEST-005' },
        descriptive: {
          ageGroup: '',
          sportsTeam: '',
          league: '',
          material: [],
          primaryColor: '',
        },
        source: {
          rics: {
            category: 'M|FTW|CASUAL|ADULT',
            longDescription: 'Leather and mesh shoe in blue color. Features MLB Yankees logo.',
          },
        },
      };

      const result = runSmartDetect(product);

      // Age Group: autoApply false (0.85)
      const age = result.suggestions.find(s => s.fieldPath === 'descriptive.ageGroup');
      expect(age?.autoApply).toBe(false);

      // Sports Team: autoApply false (text-based, 0.8)
      const team = result.suggestions.find(s => s.fieldPath === 'descriptive.sportsTeam');
      expect(team?.autoApply).toBe(false);

      // League: autoApply false (text-based, 0.85)
      const league = result.suggestions.find(s => s.fieldPath === 'descriptive.league');
      expect(league?.autoApply).toBe(false);

      // Materials: autoApply false (text-based, 0.8)
      const materials = result.suggestions.find(s => s.fieldPath === 'descriptive.material');
      expect(materials?.autoApply).toBe(false);

      // Color from text: autoApply false (text-based, 0.7)
      const color = result.suggestions.find(s => s.fieldPath === 'descriptive.primaryColor');
      expect(color?.autoApply).toBe(false);
    });
  });

  describe('Helper Functions', () => {
    it('should normalize color values properly', () => {
      const productWithComplexColor = {
        sku_core: { mpn: 'TEST-006' },
        descriptive: { primaryColor: '' },
        source: {
          rics: {
            category: 'M|FTW|CASUAL|ADULT',
            color: 'bright-yellow_green',
          },
        },
      };

      const result = runSmartDetect(productWithComplexColor);
      const color = result.suggestions.find(s => s.fieldPath === 'descriptive.primaryColor');

      expect(color?.suggestedValue).toBe('Bright Yellow Green');
    });

    it('should use mapping tables for department and class', () => {
      const productWithMappedValues = {
        sku_core: { mpn: 'TEST-007', department: '', class: '' },
        descriptive: {},
        source: {
          rics: {
            category: 'M|ACC|TRAINING|ADULT',
          },
        },
      };

      const result = runSmartDetect(productWithMappedValues);

      // Department should be mapped
      const dept = result.suggestions.find(s => s.fieldPath === 'sku_core.department');
      expect(dept?.suggestedValue).toBe('Accessories');

      // Class should be mapped
      const cls = result.suggestions.find(s => s.fieldPath === 'sku_core.class');
      expect(cls?.suggestedValue).toBe('Athletic');
    });
  });

  describe('No Overwrite Logic', () => {
    it('should not suggest values for fields that already have data', () => {
      const productWithExistingData = {
        sku_core: {
          mpn: 'TEST-008',
          department: 'Existing Dept',
          class: 'Existing Class',
          name: 'Existing Name',
        },
        descriptive: {
          gender: "Existing Gender",
          primaryColor: 'Existing Color',
        },
        source: {
          rics: {
            category: 'M|FTW|BASKETBALL|YOUTH',
            shortDescription: 'New Name',
            color: 'new-color',
          },
        },
      };

      const result = runSmartDetect(productWithExistingData);

      // Should not suggest for fields with existing values
      expect(result.suggestions.find(s => s.fieldPath === 'sku_core.department')).toBeUndefined();
      expect(result.suggestions.find(s => s.fieldPath === 'sku_core.class')).toBeUndefined();
      expect(result.suggestions.find(s => s.fieldPath === 'sku_core.name')).toBeUndefined();
      expect(result.suggestions.find(s => s.fieldPath === 'descriptive.gender')).toBeUndefined();
      expect(result.suggestions.find(s => s.fieldPath === 'descriptive.primaryColor')).toBeUndefined();
    });
  });
});
