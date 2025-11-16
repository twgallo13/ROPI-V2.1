/**
 * Product Validator - Quality checks and ROPI Score calculation
 */

export interface ValidationIssue {
  code: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  fieldPath?: string;
}

export interface ValidationResult {
  ropiScore: number; // 0-100
  issues: ValidationIssue[];
}

/**
 * Validate product and calculate ROPI Score
 */
export function validateProduct(product: any): ValidationResult {
  const issues: ValidationIssue[] = [];
  
  // Critical validations (block save if CRITICAL)
  
  // Required core fields
  if (!product.sku_core?.mpn) {
    issues.push({
      code: 'MISSING_MPN',
      message: 'MPN (Product ID) is required',
      severity: 'critical',
      fieldPath: 'sku_core.mpn'
    });
  }
  
  if (!product.sku_core?.brand) {
    issues.push({
      code: 'MISSING_BRAND',
      message: 'Brand is required',
      severity: 'critical',
      fieldPath: 'sku_core.brand'
    });
  }
  
  if (!product.sku_core?.name) {
    issues.push({
      code: 'MISSING_NAME',
      message: 'Product name is required',
      severity: 'critical',
      fieldPath: 'sku_core.name'
    });
  }
  
  // Warning validations (recommended but don't block save)
  
  if (!product.sku_core?.department) {
    issues.push({
      code: 'MISSING_DEPARTMENT',
      message: 'Department helps with categorization',
      severity: 'warning',
      fieldPath: 'sku_core.department'
    });
  }
  
  if (!product.sku_core?.category) {
    issues.push({
      code: 'MISSING_CATEGORY',
      message: 'Category improves searchability',
      severity: 'warning',
      fieldPath: 'sku_core.category'
    });
  }
  
  if (!product.descriptive?.ageGroup) {
    issues.push({
      code: 'MISSING_AGE_GROUP',
      message: 'Age group helps target the right audience',
      severity: 'warning',
      fieldPath: 'descriptive.ageGroup'
    });
  }
  
  if (!product.descriptive?.gender) {
    issues.push({
      code: 'MISSING_GENDER',
      message: 'Gender specification improves targeting',
      severity: 'warning',
      fieldPath: 'descriptive.gender'
    });
  }
  
  // Department-specific validations
  if (product.sku_core?.department === 'Footwear') {
    if (!product.descriptive?.fit) {
      issues.push({
        code: 'MISSING_FIT',
        message: 'Fit is important for footwear products',
        severity: 'warning',
        fieldPath: 'descriptive.fit'
      });
    }
    
    if (!product.descriptive?.material || product.descriptive.material.length === 0) {
      issues.push({
        code: 'MISSING_MATERIALS',
        message: 'Materials help customers understand construction',
        severity: 'info',
        fieldPath: 'descriptive.material'
      });
    }
  }
  
  // SEO validations
  if (!product.descriptive?.metaName || product.descriptive.metaName.length === 0) {
    issues.push({
      code: 'MISSING_META_NAME',
      message: 'Meta name (SEO title) improves search visibility',
      severity: 'warning',
      fieldPath: 'descriptive.metaName'
    });
  } else if (product.descriptive.metaName.length > 60) {
    issues.push({
      code: 'LONG_META_NAME',
      message: `Meta name is ${product.descriptive.metaName.length} chars (recommended ≤60)`,
      severity: 'info',
      fieldPath: 'descriptive.metaName'
    });
  }
  
  if (!product.descriptive?.metaDescription || product.descriptive.metaDescription.length === 0) {
    issues.push({
      code: 'MISSING_META_DESCRIPTION',
      message: 'Meta description improves search visibility',
      severity: 'warning',
      fieldPath: 'descriptive.metaDescription'
    });
  } else if (product.descriptive.metaDescription.length > 155) {
    issues.push({
      code: 'LONG_META_DESCRIPTION',
      message: `Meta description is ${product.descriptive.metaDescription.length} chars (recommended ≤155)`,
      severity: 'info',
      fieldPath: 'descriptive.metaDescription'
    });
  } else if (product.descriptive.metaDescription.length < 50) {
    issues.push({
      code: 'SHORT_META_DESCRIPTION',
      message: 'Meta description is too short (recommended 50-155 chars)',
      severity: 'info',
      fieldPath: 'descriptive.metaDescription'
    });
  }
  
  // Description validation
  if (!product.descriptive?.description || product.descriptive.description.length === 0) {
    issues.push({
      code: 'MISSING_DESCRIPTION',
      message: 'Product description helps customers make decisions',
      severity: 'warning',
      fieldPath: 'descriptive.description'
    });
  } else if (product.descriptive.description.length < 100) {
    issues.push({
      code: 'SHORT_DESCRIPTION',
      message: 'Product description seems short (recommended >100 chars)',
      severity: 'info',
      fieldPath: 'descriptive.description'
    });
  }
  
  // Pricing validation
  if (!product.pricing?.retail_price || product.pricing.retail_price <= 0) {
    issues.push({
      code: 'MISSING_PRICE',
      message: 'Retail price is required for product listing',
      severity: 'critical',
      fieldPath: 'pricing.retail_price'
    });
  }
  
  // Technical status validation
  if (!product.technical?.status) {
    issues.push({
      code: 'MISSING_TECH_STATUS',
      message: 'Technical status helps track completion',
      severity: 'info',
      fieldPath: 'technical.status'
    });
  }
  
  // AI validation (never critical)
  if (!product.ai?.description_generated) {
    issues.push({
      code: 'NO_AI_DESCRIPTION',
      message: 'Consider generating an AI description for better content',
      severity: 'info',
      fieldPath: 'ai.description_generated'
    });
  }
  
  // Calculate ROPI Score (0-100)
  let score = 100;
  
  // Subtract points for issues
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;
  
  // Critical issues: -20 points each
  score -= criticalCount * 20;
  
  // Warning issues: -5 points each
  score -= warningCount * 5;
  
  // Info issues: -2 points each
  score -= infoCount * 2;
  
  // Bonus points for completeness
  let completenessBonus = 0;
  
  // Core completeness
  if (product.sku_core?.mpn && product.sku_core?.brand && product.sku_core?.name) {
    completenessBonus += 5;
  }
  
  // Descriptive completeness
  if (product.descriptive?.ageGroup && product.descriptive?.gender && 
      product.descriptive?.metaName && product.descriptive?.metaDescription) {
    completenessBonus += 5;
  }
  
  // Rich content
  if (product.descriptive?.description && product.descriptive.description.length > 200) {
    completenessBonus += 3;
  }
  
  // AI enhancement
  if (product.ai?.description_generated && product.ai?.scores?.overall >= 8) {
    completenessBonus += 2;
  }
  
  score += completenessBonus;
  
  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score));
  
  return {
    ropiScore: Math.round(score),
    issues
  };
}