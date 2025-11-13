/**
 * AI Template Selection Logic (P14.1)
 * Condition-based template matching with fallback to default
 */

import * as admin from 'firebase-admin';

export interface TemplateCondition {
  field: 'gender' | 'department' | 'ageGroup' | 'materials' | 'launchDate';
  operator: '==' | 'is-any-of' | 'includes' | 'within-last-n-days';
  value: string | string[] | number;
}

export interface AITemplate {
  key: string;
  scope: string;
  title: string;
  status?: 'active' | 'draft' | 'disabled';
  description?: string;
  version: string;
  conditions?: TemplateCondition[];
  matchMode?: 'ALL' | 'ANY';
  format?: any;
  voice?: any;
  seo?: any;
  prompt_body?: string;
  seo_rules?: string;
  tone_rules?: string;
  length_rules?: string;
  banned_terms?: string[];
  updatedBy?: string;
  updatedAt?: any;
}

export interface TemplateSelectionResult {
  template: AITemplate;
  conditionsMatched?: string[];
  fallbackReason?: string;
}

interface ProductData {
  gender?: string;
  department?: string;
  ageGroup?: string;
  materials?: string[];
  launchDate?: string | null;
}

/**
 * Load all active templates from Firestore
 */
export async function loadAllTemplates(): Promise<AITemplate[]> {
  try {
    const db = admin.firestore();
    const templatesSnapshot = await db
      .collection('settings')
      .doc('ai')
      .collection('prompts')
      .get();

    const templates: AITemplate[] = [];
    templatesSnapshot.forEach(doc => {
      const data = doc.data() as AITemplate;
      // Only include active or templates without status (backwards compat)
      if (!data.status || data.status === 'active') {
        templates.push({ ...data, key: doc.id });
      }
    });

    console.log(`[template-selection] Loaded ${templates.length} active templates`);
    return templates;
  } catch (error) {
    console.error('[template-selection] Failed to load templates:', error);
    return [];
  }
}

/**
 * Load a single template by key from Firestore
 */
export async function loadTemplateByKey(key: string): Promise<AITemplate | null> {
  try {
    const db = admin.firestore();
    const docRef = await db
      .collection('settings')
      .doc('ai')
      .collection('prompts')
      .doc(key)
      .get();

    if (!docRef.exists) return null;
    const data = docRef.data() as AITemplate;
    if (data && (data.status === 'disabled')) return null;
    return { ...data, key } as AITemplate;
  } catch (error) {
    console.error('[template-selection] Failed to load template by key:', key, error);
    return null;
  }
}

/**
 * Evaluate a single condition against product data
 */
function evaluateCondition(condition: TemplateCondition, product: ProductData): boolean {
  const { field, operator, value } = condition;
  const productValue = product[field];

  switch (operator) {
    case '==':
      return String(productValue).toLowerCase() === String(value).toLowerCase();

    case 'is-any-of':
      if (!Array.isArray(value)) return false;
      const productValueLower = String(productValue || '').toLowerCase();
      return value.some(v => String(v).toLowerCase() === productValueLower);

    case 'includes':
      if (field === 'materials' && Array.isArray(product.materials)) {
        const searchTerm = String(value).toLowerCase();
        return product.materials.some(m => m.toLowerCase().includes(searchTerm));
      }
      return String(productValue || '').toLowerCase().includes(String(value).toLowerCase());

    case 'within-last-n-days':
      if (field !== 'launchDate' || !product.launchDate) return false;
      try {
        const launch = new Date(product.launchDate);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - launch.getTime()) / (1000 * 60 * 60 * 24));
        const daysThreshold = typeof value === 'number' ? value : parseInt(String(value));
        return daysDiff >= 0 && daysDiff <= daysThreshold;
      } catch (e) {
        console.warn(`[template-selection] Failed to parse launch date: ${product.launchDate}`);
        return false;
      }

    default:
      return false;
  }
}

/**
 * Check if a template matches the product based on its conditions
 */
function matchesTemplate(template: AITemplate, product: ProductData): { matches: boolean; conditionsMatched: string[] } {
  const conditions = template.conditions || [];
  
  // If no conditions, this is a fallback template (e.g., default)
  if (conditions.length === 0) {
    return { matches: true, conditionsMatched: [] };
  }

  const matchMode = template.matchMode || 'ALL';
  const conditionsMatched: string[] = [];

  for (const condition of conditions) {
    const matches = evaluateCondition(condition, product);
    if (matches) {
      const matchDesc = `${condition.field}${condition.operator}${Array.isArray(condition.value) ? condition.value.join('|') : condition.value}`;
      conditionsMatched.push(matchDesc);
    }
  }

  // Check match mode
  if (matchMode === 'ALL') {
    return {
      matches: conditionsMatched.length === conditions.length,
      conditionsMatched
    };
  } else {
    // ANY mode
    return {
      matches: conditionsMatched.length > 0,
      conditionsMatched
    };
  }
}

/**
 * Select the best matching template for a product
 * Priority: First matching template with conditions, then default template
 */
export async function selectTemplate(product: ProductData): Promise<TemplateSelectionResult> {
  const templates = await loadAllTemplates();

  if (templates.length === 0) {
    throw new Error('No active templates found in Firestore');
  }

  // First, try to find templates with conditions that match
  const templatesWithConditions = templates.filter(t => (t.conditions || []).length > 0);
  
  for (const template of templatesWithConditions) {
    const { matches, conditionsMatched } = matchesTemplate(template, product);
    if (matches) {
      console.log(`[template-selection] Matched template: ${template.key} (${conditionsMatched.join(', ')})`);
      return {
        template,
        conditionsMatched
      };
    }
  }

  // Fallback to default template (no conditions)
  const defaultTemplate = templates.find(t => t.key === 'default' || (t.conditions || []).length === 0);
  
  if (defaultTemplate) {
    console.log('[template-selection] No conditions matched, using default template');
    return {
      template: defaultTemplate,
      fallbackReason: 'No matching conditions, using default'
    };
  }

  // Last resort: use first template
  console.warn('[template-selection] No default template found, using first available');
  return {
    template: templates[0],
    fallbackReason: 'No default template found'
  };
}
