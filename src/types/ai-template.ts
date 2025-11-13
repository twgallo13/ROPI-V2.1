/**
 * AI Template Builder Types (P14.1)
 * Extended schema for no-code template configuration
 */

export type TemplateStatus = 'active' | 'draft' | 'disabled';
export type LayoutStyle = 'headline+paragraph+bullets' | 'paragraph-only' | 'short-blurb';
export type VoicePreset = 'clean-retail' | 'hype-drop' | 'parent-friendly' | 'tech-performance' | 'luxury';
export type MatchMode = 'ALL' | 'ANY';
export type ConditionOperator = '==' | 'is-any-of' | 'includes' | 'within-last-n-days';
export type ConditionField = 'gender' | 'department' | 'ageGroup' | 'materials' | 'launchDate';
export type BulletTopic = 'fit' | 'comfort' | 'durability' | 'use_case' | 'care' | 'traction';

export interface TemplateCondition {
  field: ConditionField;
  operator: ConditionOperator;
  value: string | string[] | number;
}

export interface ParagraphConfig {
  min: number; // min words
  max: number; // max words
  allowTwoParagraphs: boolean;
}

export interface BulletsConfig {
  min: number; // min bullet count
  max: number; // max bullet count
  topics: BulletTopic[];
}

export interface FormatConfig {
  layout: LayoutStyle;
  headlineEnabled: boolean;
  headlinePattern?: string; // e.g., "{{brand}} {{name}} - {{fit}} {{category}}"
  paragraph: ParagraphConfig;
  bullets: BulletsConfig;
}

export interface VoiceConfig {
  preset: VoicePreset;
  description: string; // custom voice description
  avoid: string[]; // words to avoid
  brandRules: string; // brand-specific tone rules
}

export interface SEOConfig {
  metaTitlePattern: string; // e.g., "{{brand}} {{name}} | {{fit}} {{category}}"
  includeFit: boolean;
  includeUseCase: boolean;
  includeMaterial: boolean;
}

/**
 * Extended AI Template with structured config (P14.1)
 * Backwards compatible with P14.0 schema
 */
export interface AITemplate {
  // Basic info
  key: string;
  scope: string;
  title: string;
  status?: TemplateStatus; // NEW: active/draft/disabled
  description?: string; // NEW: template description
  version: string;
  updatedBy?: string;
  updatedAt?: any;

  // Legacy fields (P14.0 - keep for backwards compatibility)
  prompt_body?: string; // fallback if structured config not present
  seo_rules?: string;
  tone_rules?: string;
  length_rules?: string;
  examples?: Array<{ label: string; input: string; output: string }>;
  banned_terms?: string | string[];

  // NEW: Structured config (P14.1)
  conditions?: TemplateCondition[];
  matchMode?: MatchMode;
  format?: FormatConfig;
  voice?: VoiceConfig;
  seo?: SEOConfig;
}

/**
 * Template selection result with debug info
 */
export interface TemplateSelectionResult {
  template: AITemplate;
  conditionsMatched?: string[];
  fallbackReason?: string;
}
