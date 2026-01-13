// packages/api/src/lib/settingsHelpers.ts
import { getFirestore } from 'firebase-admin/firestore';

const firestore = getFirestore();
import { logger } from './logger';

/**
 * Settings Helpers for AI Describe Feature
 * 
 * Provides utilities to load registry attributes, AI templates,
 * and handle template selection with site-based fallbacks.
 */

interface RegistryAttribute {
  attribute_id: string;
  status: 'active' | 'inactive';
  aiInput?: boolean;
  aiUsage?: string[];
  required_for_completion?: boolean;
  ai_usage_notes?: string;
  [key: string]: any;
}

interface AITemplate {
  key: string;
  priority?: number;
  site?: string;
  includeObservations?: boolean;
  includeAttributeNotes?: boolean;
  requiredAttributes?: string[];
  conditions?: any[];
  prompt?: string;
  modelSettings?: {
    model: string;
    maxOutputTokens?: number;
    temperature?: number;
  };
  [key: string]: any;
}

/**
 * Cache for registry data to avoid repeated Firestore calls
 */
let registryCache: { data: Record<string, RegistryAttribute> | null; timestamp: number } = {
  data: null,
  timestamp: 0
};

const REGISTRY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Cache for templates to avoid repeated Firestore calls
 */
let templatesCache: { data: Record<string, AITemplate> | null; timestamp: number } = {
  data: null,
  timestamp: 0
};

const TEMPLATES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load attribute registry from Firestore with caching
 * @returns Map of attribute_id => registry metadata
 */
export async function loadRegistry(): Promise<Record<string, RegistryAttribute>> {
  const now = Date.now();
  
  // Check cache first
  if (registryCache.data && (now - registryCache.timestamp) < REGISTRY_CACHE_TTL) {
    logger.debug('Using cached registry data');
    return registryCache.data;
  }

  try {
    logger.info('Loading registry from Firestore');
    const registrySnap = await firestore.collection('registry').get();
    
    const registry: Record<string, RegistryAttribute> = {};
    registrySnap.docs.forEach(doc => {
      const data = doc.data() as RegistryAttribute;
      registry[doc.id] = {
        attribute_id: doc.id,
        ...data
      };
    });

    // Update cache
    registryCache = {
      data: registry,
      timestamp: now
    };

    logger.info('Registry loaded successfully', {
      attributeCount: Object.keys(registry).length,
      cached: true
    });

    return registry;
  } catch (error) {
    logger.error('Failed to load registry', { error });
    
    // Return cached data if available, even if expired
    if (registryCache.data) {
      logger.warn('Using expired registry cache due to load error');
      return registryCache.data;
    }
    
    throw new Error(`Failed to load attribute registry: ${error.message}`);
  }
}

/**
 * Load AI templates from Firestore with caching
 * @returns Map of template key => template data
 */
async function loadTemplates(): Promise<Record<string, AITemplate>> {
  const now = Date.now();
  
  // Check cache first
  if (templatesCache.data && (now - templatesCache.timestamp) < TEMPLATES_CACHE_TTL) {
    logger.debug('Using cached templates data');
    return templatesCache.data;
  }

  try {
    logger.info('Loading AI templates from Firestore');
    
    // Load from ai_templates collection (or wherever templates are stored)
    const templatesSnap = await firestore.collection('ai_templates').get();
    
    const templates: Record<string, AITemplate> = {};
    templatesSnap.docs.forEach(doc => {
      const data = doc.data() as AITemplate;
      templates[doc.id] = {
        key: doc.id,
        ...data
      };
    });

    // Update cache
    templatesCache = {
      data: templates,
      timestamp: now
    };

    logger.info('AI templates loaded successfully', {
      templateCount: Object.keys(templates).length,
      cached: true
    });

    return templates;
  } catch (error) {
    logger.error('Failed to load AI templates', { error });
    
    // Return cached data if available, even if expired
    if (templatesCache.data) {
      logger.warn('Using expired templates cache due to load error');
      return templatesCache.data;
    }
    
    // Return default template if no templates exist
    logger.warn('No AI templates found, returning default template');
    return {
      'default': {
        key: 'default',
        priority: 0,
        prompt: 'Generate a product description for {{product.mpn}} with these attributes: {{attributes}}',
        modelSettings: {
          model: process.env.DEFAULT_AI_MODEL || 'gemini-1.5-flash',
          maxOutputTokens: 1024,
          temperature: 0.7
        }
      }
    };
  }
}

/**
 * Load specific template by key
 * @param templateKey Template identifier
 * @returns Template data or null if not found
 */
export async function loadTemplate(templateKey: string): Promise<AITemplate | null> {
  try {
    const templates = await loadTemplates();
    return templates[templateKey] || null;
  } catch (error) {
    logger.error('Failed to load template', { templateKey, error });
    return null;
  }
}

/**
 * Load template for specific site with priority-based selection
 * @param site Target site (e.g., 'shiekh', 'ccs', etc.)
 * @returns Best matching template or default template
 */
export async function loadTemplateForSite(site: string): Promise<AITemplate | null> {
  try {
    const templates = await loadTemplates();
    const templateList = Object.values(templates);
    
    // Filter templates that match the site or have no site restriction
    const candidateTemplates = templateList.filter(template => 
      !template.site || template.site === site
    );

    if (candidateTemplates.length === 0) {
      logger.warn('No templates found for site', { site });
      return templates['default'] || null;
    }

    // Sort by priority (higher priority first)
    candidateTemplates.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    const selectedTemplate = candidateTemplates[0];
    
    logger.info('Template selected for site', {
      site,
      templateKey: selectedTemplate.key,
      priority: selectedTemplate.priority || 0,
      candidateCount: candidateTemplates.length
    });

    return selectedTemplate;
  } catch (error) {
    logger.error('Failed to load template for site', { site, error });
    return null;
  }
}

/**
 * Clear registry cache (useful for testing or admin operations)
 */
export function clearRegistryCache(): void {
  registryCache = { data: null, timestamp: 0 };
  logger.info('Registry cache cleared');
}

/**
 * Clear templates cache (useful for testing or admin operations)
 */
export function clearTemplatesCache(): void {
  templatesCache = { data: null, timestamp: 0 };
  logger.info('Templates cache cleared');
}

/**
 * Get cache status for monitoring
 */
export function getCacheStatus() {
  const now = Date.now();
  return {
    registry: {
      cached: registryCache.data !== null,
      age: registryCache.timestamp ? now - registryCache.timestamp : null,
      expired: registryCache.timestamp ? (now - registryCache.timestamp) > REGISTRY_CACHE_TTL : true,
      attributeCount: registryCache.data ? Object.keys(registryCache.data).length : 0
    },
    templates: {
      cached: templatesCache.data !== null,
      age: templatesCache.timestamp ? now - templatesCache.timestamp : null,
      expired: templatesCache.timestamp ? (now - templatesCache.timestamp) > TEMPLATES_CACHE_TTL : true,
      templateCount: templatesCache.data ? Object.keys(templatesCache.data).length : 0
    }
  };
}

export default {
  loadRegistry,
  loadTemplate,
  loadTemplateForSite,
  clearRegistryCache,
  clearTemplatesCache,
  getCacheStatus
};