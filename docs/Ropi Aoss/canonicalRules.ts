/**
 * ROPI Smart Rules - Canonical Seed Pack v1
 * ==========================================
 * 20 canonical rules covering common product attribute detection and normalization.
 * 
 * Based on: ROPI AOSS v1.0 — Section 4.14
 * 
 * Rule ID Format: sd_XXX_descriptive_name
 * Priority Range: 1000 (highest) to 800 (lowest for seeds)
 */

import { SmartRule } from './smartEngine';

export const CANONICAL_RULES: SmartRule[] = [
  // ==========================================================================
  // sd_001: Gender from RICS Category
  // ==========================================================================
  {
    ruleId: 'sd_001_gender_from_rics',
    name: 'Gender from RICS Category',
    description: "Set descriptive.gender from RICS category tokens: Mens → Men's, Womens → Women's, Boys/Girls → Boys/Girls.",
    enabled: true,
    priority: 1000,
    tags: ['rics', 'gender', 'core'],
    condition: {
      source: 'source.rics.category_tokens',
      matchType: 'token',
      value: ['Mens', 'Womens', 'Boys', 'Girls', 'Unisex'],
    },
    action: {
      targetField: 'descriptive.gender',
      valueTemplate: "{{#if (contains captures.tokens 'mens')}}Men's{{else if (contains captures.tokens 'womens')}}Women's{{else if (contains captures.tokens 'boys')}}Boys{{else if (contains captures.tokens 'girls')}}Girls{{else if (contains captures.tokens 'unisex')}}Unisex{{/if}}",
      confidenceModifier: 1.0,
    },
    autoApply: true,
    autoApplyConfidence: 0.9,
  },

  // ==========================================================================
  // sd_002: Age Group from RICS Category
  // ==========================================================================
  {
    ruleId: 'sd_002_agegroup_from_rics',
    name: 'Age Group from RICS Category',
    description: 'Map RICS tokens (Grade-School, Preschool, Toddler, Infant, Adult) to descriptive.ageGroup.',
    enabled: true,
    priority: 990,
    tags: ['rics', 'ageGroup', 'core'],
    condition: {
      source: 'source.rics.category_tokens',
      matchType: 'token',
      value: ['Grade-School', 'Grade School', 'Pre-School', 'Preschool', 'Toddler', 'Infant', 'Adult', 'Kids'],
    },
    action: {
      targetField: 'descriptive.ageGroup',
      valueTemplate: "{{#if (contains captures.tokens 'grade school')}}Grade School{{else if (contains captures.tokens 'pre-school')}}Pre-School{{else if (contains captures.tokens 'toddler')}}Toddler{{else if (contains captures.tokens 'infant')}}Infant{{else if (contains captures.tokens 'kids')}}Kids{{else}}Adult{{/if}}",
      confidenceModifier: 1.0,
    },
    autoApply: true,
    autoApplyConfidence: 0.85,
  },

  // ==========================================================================
  // sd_003: Primary Color from RICS
  // ==========================================================================
  {
    ruleId: 'sd_003_primarycolor_from_rics',
    name: 'Primary Color from RICS color',
    description: 'Normalize primary color from RICS.color using synonyms; set descriptive.primaryColor.',
    enabled: true,
    priority: 980,
    tags: ['rics', 'color', 'core'],
    condition: {
      source: 'source.rics.color',
      matchType: 'exists',
      value: true,
    },
    action: {
      targetField: 'descriptive.primaryColor',
      valueTemplate: '{{normalizeColor source.rics.color}}',
      confidenceModifier: 1.0,
    },
    autoApply: true,
    autoApplyConfidence: 0.95,
  },

  // ==========================================================================
  // sd_004: Department from RICS Category
  // ==========================================================================
  {
    ruleId: 'sd_004_category_from_rics',
    name: 'Department from RICS tokens',
    description: 'Parse RICS category tokens to department/class/category.',
    enabled: true,
    priority: 970,
    tags: ['rics', 'department', 'core'],
    condition: {
      source: 'source.rics.category_tokens',
      matchType: 'token',
      value: ['Footwear', 'Apparel', 'Accessories', 'Bags', 'Beauty', 'Home', 'Kids', 'Toys'],
    },
    action: {
      targetField: 'sku_core.department',
      valueTemplate: "{{firstMatch captures.tokens (array 'footwear' 'apparel' 'accessories' 'bags' 'beauty' 'home' 'kids' 'toys')}}",
      confidenceModifier: 1.0,
    },
    autoApply: true,
    autoApplyConfidence: 0.92,
  },

  // ==========================================================================
  // sd_005: Category/Subclass from RICS
  // ==========================================================================
  {
    ruleId: 'sd_005_category_subclass_map',
    name: 'Class / Category mapping from RICS',
    description: "Map tokens like 'Running'/'Basketball' to category/class values.",
    enabled: true,
    priority: 960,
    tags: ['rics', 'category', 'core'],
    condition: {
      source: 'source.rics.category_tokens',
      matchType: 'token',
      value: ['Running', 'Basketball', 'Skate', 'Casual', 'Dress', 'Athletic', 'Lifestyle', 'Training', 'Soccer', 'Football'],
    },
    action: {
      targetField: 'sku_core.category',
      valueTemplate: "{{firstMatch captures.tokens (array 'running' 'basketball' 'skate' 'casual' 'dress' 'athletic' 'lifestyle' 'training' 'soccer' 'football')}}",
      confidenceModifier: 1.0,
    },
    autoApply: true,
    autoApplyConfidence: 0.9,
  },

  // ==========================================================================
  // sd_006: Product Name Suggestion (NOT auto-apply)
  // ==========================================================================
  {
    ruleId: 'sd_006_product_name_suggestion_from_rics',
    name: 'Product name suggestion from RICS short description',
    description: 'Suggest product name using brand + RICS shortDescription (guarded by UUID detection & observations).',
    enabled: true,
    priority: 950,
    tags: ['rics', 'name', 'suggestion-only'],
    condition: {
      source: 'source.rics.shortDescription',
      matchType: 'exists',
      value: true,
    },
    action: {
      targetField: 'sku_core.name',
      valueTemplate: '{{sku_core.brand}} {{normalizeName source.rics.shortDescription}}',
      confidenceModifier: 0.8,
    },
    autoApply: false,
    autoApplyConfidence: 0.0,
  },

  // ==========================================================================
  // sd_007: Family Sizing Detection
  // ==========================================================================
  {
    ruleId: 'sd_007_family_sizing_detect',
    name: 'Detect Family Sizing from shortName tokens',
    description: "If RICS shortName includes 'Family' or multiple size tokens, set familySizing=true.",
    enabled: true,
    priority: 940,
    tags: ['sizing', 'family'],
    condition: {
      source: 'source.rics.shortDescription',
      matchType: 'regex',
      value: '(?i)family|pack|bundle',
      options: { caseInsensitive: true },
    },
    action: {
      targetField: 'descriptive.familySizing',
      valueTemplate: 'true',
      confidenceModifier: 1.0,
    },
    autoApply: true,
    autoApplyConfidence: 0.9,
  },

  // ==========================================================================
  // sd_008: Closure Type from Observations
  // ==========================================================================
  {
    ruleId: 'sd_008_closure_from_observations',
    name: 'Closure type from observation ai_insights',
    description: "If observation AI mentions 'lace-up' or 'zip', set descriptive.closureType",
    enabled: true,
    priority: 930,
    tags: ['observations', 'closure'],
    condition: {
      source: 'observations.ai_insights',
      matchType: 'token',
      value: ['lace-up', 'lace up', 'zip', 'zipper', 'slip-on', 'slip on', 'bungee', 'velcro', 'hook-and-loop', 'buckle', 'toggle'],
    },
    action: {
      targetField: 'descriptive.closureType',
      valueTemplate: "{{firstMatch captures.tokens (array 'lace-up' 'zip' 'slip-on' 'bungee' 'velcro' 'buckle' 'toggle')}}",
      confidenceModifier: 1.0,
    },
    autoApply: true,
    autoApplyConfidence: 0.9,
  },

  // ==========================================================================
  // sd_009: Heel Type from Observations
  // ==========================================================================
  {
    ruleId: 'sd_009_heel_type_from_observations',
    name: 'Heel type from observation ai_insights',
    description: 'Detect heel type (wedge/kitten/stiletto) from observations or image analysis',
    enabled: true,
    priority: 920,
    tags: ['observations', 'heel', 'footwear'],
    condition: {
      source: 'observations.ai_insights',
      matchType: 'token',
      value: ['wedge', 'kitten', 'kitten heel', 'stiletto', 'block', 'block heel', 'platform', 'chunky', 'cone', 'spool'],
    },
    action: {
      targetField: 'descriptive.heelType',
      valueTemplate: "{{firstMatch captures.tokens (array 'wedge' 'kitten' 'stiletto' 'block' 'platform' 'chunky' 'cone' 'spool')}}",
      confidenceModifier: 1.0,
    },
    autoApply: true,
    autoApplyConfidence: 0.85,
  },

  // ==========================================================================
  // sd_010: Heel Height Mapping
  // ==========================================================================
  {
    ruleId: 'sd_010_heel_height_map',
    name: 'Map heel height descriptors to standardized ranges',
    description: 'Map height measurements from observations to standardized categories.',
    enabled: true,
    priority: 910,
    tags: ['observations', 'heel', 'footwear'],
    condition: {
      source: 'observations.ai_insights',
      matchType: 'regex',
      value: '(\\d+(?:\\.\\d+)?)[\\s-]*(inch|in|\\"|cm)',
      options: { caseInsensitive: true },
    },
    action: {
      targetField: 'descriptive.heelHeight',
      valueTemplate: '{{regexGroup 1}}"',
      confidenceModifier: 0.9,
    },
    autoApply: true,
    autoApplyConfidence: 0.9,
  },

  // ==========================================================================
  // sd_011: Pattern from Image Observations
  // ==========================================================================
  {
    ruleId: 'sd_011_pattern_from_images',
    name: 'Pattern detection from image observations',
    description: 'Detect patterns (solid, camo, tie-dye, animal print) from AI image analysis.',
    enabled: true,
    priority: 900,
    tags: ['observations', 'pattern', 'images'],
    condition: {
      source: 'observations.ai_insights',
      matchType: 'token',
      value: ['solid', 'camo', 'camouflage', 'tie-dye', 'tie dye', 'animal print', 'leopard', 'zebra', 'snake', 'plaid', 'checkered', 'striped', 'polka dot', 'floral', 'abstract'],
    },
    action: {
      targetField: 'descriptive.pattern',
      valueTemplate: "{{firstMatch captures.tokens (array 'solid' 'camo' 'tie-dye' 'animal print' 'plaid' 'striped' 'polka dot' 'floral' 'abstract')}}",
      confidenceModifier: 0.9,
    },
    autoApply: true,
    autoApplyConfidence: 0.85,
  },

  // ==========================================================================
  // sd_012: Material Normalization
  // ==========================================================================
  {
    ruleId: 'sd_012_material_normalize',
    name: 'Material normalization from RICS/observations',
    description: 'Normalize material values (leather, mesh, canvas, suede, etc.)',
    enabled: true,
    priority: 890,
    tags: ['material', 'normalization'],
    condition: {
      matchType: 'or',
      value: [
        {
          source: 'source.rics.material',
          matchType: 'exists',
          value: true,
        },
        {
          source: 'observations.ai_insights',
          matchType: 'token',
          value: ['leather', 'suede', 'nubuck', 'canvas', 'mesh', 'knit', 'synthetic', 'patent', 'vinyl', 'rubber', 'textile', 'fabric', 'nylon', 'polyester'],
        },
      ],
    },
    action: {
      targetField: 'descriptive.material',
      valueTemplate: "{{firstMatch captures.tokens (array 'leather' 'suede' 'nubuck' 'canvas' 'mesh' 'knit' 'synthetic' 'patent' 'vinyl' 'rubber' 'textile' 'nylon' 'polyester')}}",
      confidenceModifier: 0.9,
    },
    autoApply: true,
    autoApplyConfidence: 0.85,
  },

  // ==========================================================================
  // sd_013: Fast Fashion Flag
  // ==========================================================================
  {
    ruleId: 'sd_013_fast_fashion_flag',
    name: 'Flag fast fashion items',
    description: 'Detect and flag fast fashion items based on brand or keywords.',
    enabled: true,
    priority: 880,
    tags: ['category', 'fast-fashion'],
    condition: {
      matchType: 'or',
      value: [
        {
          source: 'sku_core.brand',
          matchType: 'in',
          value: ['Fashion Nova', 'Shein', 'Zaful', 'Romwe'],
        },
        {
          source: 'source.rics.category_tokens',
          matchType: 'token',
          value: ['fast fashion', 'trendy', 'seasonal'],
        },
      ],
    },
    action: {
      targetField: 'attributes.fastFashion',
      valueTemplate: 'true',
      confidenceModifier: 1.0,
    },
    autoApply: true,
    autoApplyConfidence: 0.95,
  },

  // ==========================================================================
  // sd_014: Core Product Flag
  // ==========================================================================
  {
    ruleId: 'sd_014_core_product_flag',
    name: 'Flag core/staple products',
    description: 'Identify core products that are always in stock (Air Force 1, Chuck Taylor, etc.)',
    enabled: true,
    priority: 870,
    tags: ['category', 'core-product'],
    condition: {
      source: 'source.rics.shortDescription',
      matchType: 'regex',
      value: '(?i)(air force 1|af1|chuck taylor|all star|old skool|sk8|superstar|stan smith|classic leather|club c)',
      options: { caseInsensitive: true },
    },
    action: {
      targetField: 'attributes.coreProduct',
      valueTemplate: 'true',
      confidenceModifier: 1.0,
    },
    autoApply: true,
    autoApplyConfidence: 0.95,
  },

  // ==========================================================================
  // sd_015: Tax Class Mapping
  // ==========================================================================
  {
    ruleId: 'sd_015_tax_class_map',
    name: 'Map tax class based on category',
    description: 'Assign appropriate tax class based on product category (clothing exempt in some states).',
    enabled: true,
    priority: 860,
    tags: ['tax', 'compliance'],
    condition: {
      source: 'sku_core.department',
      matchType: 'in',
      value: ['Footwear', 'Apparel', 'Accessories'],
    },
    action: {
      targetField: 'attributes.taxClass',
      valueTemplate: 'Clothing',
      confidenceModifier: 1.0,
    },
    autoApply: true,
    autoApplyConfidence: 0.95,
  },

  // ==========================================================================
  // sd_016: Platform Height Mapping
  // ==========================================================================
  {
    ruleId: 'sd_016_platform_height_map',
    name: 'Map platform height from observations',
    description: 'Detect and categorize platform height from AI observations.',
    enabled: true,
    priority: 850,
    tags: ['observations', 'platform', 'footwear'],
    condition: {
      source: 'observations.ai_insights',
      matchType: 'regex',
      value: 'platform[\\s:]*([\\d.]+)[\\s]*(inch|in|\\"|cm)',
      options: { caseInsensitive: true },
    },
    action: {
      targetField: 'descriptive.platformHeight',
      valueTemplate: '{{regexGroup 1}}"',
      confidenceModifier: 0.9,
    },
    autoApply: true,
    autoApplyConfidence: 0.85,
  },

  // ==========================================================================
  // sd_017: Sports Team to League Mapping
  // ==========================================================================
  {
    ruleId: 'sd_017_sports_team_to_league',
    name: 'Map sports team to league',
    description: 'When a team name is detected, map to the appropriate sports league.',
    enabled: true,
    priority: 840,
    tags: ['sports', 'team', 'league'],
    condition: {
      source: 'source.rics.shortDescription',
      matchType: 'regex',
      value: '(?i)(lakers|bulls|heat|celtics|warriors|knicks|nets|76ers|bucks|suns|mavericks|clippers|rockets|spurs|nuggets|jazz|pelicans|grizzlies|timberwolves|thunder|blazers|kings|hawks|hornets|magic|pistons|pacers|cavaliers|wizards|raptors)',
      options: { caseInsensitive: true },
    },
    action: {
      targetField: 'attributes.sportsLeague',
      valueTemplate: 'NBA',
      confidenceModifier: 1.0,
    },
    autoApply: true,
    autoApplyConfidence: 0.9,
  },

  // ==========================================================================
  // sd_018: Primary Color from Image Analysis
  // ==========================================================================
  {
    ruleId: 'sd_018_primary_color_from_image',
    name: 'Primary color from AI image analysis',
    description: 'Fallback: detect primary color from image observations when RICS color is missing.',
    enabled: true,
    priority: 830,
    tags: ['observations', 'color', 'images', 'fallback'],
    condition: {
      matchType: 'and',
      value: [
        {
          source: 'source.rics.color',
          matchType: 'exists',
          value: false,
        },
        {
          source: 'observations.ai_insights',
          matchType: 'token',
          value: ['black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'gray', 'grey', 'navy', 'cream', 'beige', 'tan', 'gold', 'silver', 'multi', 'multicolor'],
        },
      ],
    },
    action: {
      targetField: 'descriptive.primaryColor',
      valueTemplate: "{{firstMatch captures.tokens (array 'black' 'white' 'red' 'blue' 'green' 'yellow' 'orange' 'purple' 'pink' 'brown' 'gray' 'navy' 'cream' 'beige' 'tan' 'gold' 'silver' 'multicolor')}}",
      confidenceModifier: 0.8,
    },
    autoApply: true,
    autoApplyConfidence: 0.8,
  },

  // ==========================================================================
  // sd_019: Duplicate Suspect Flag
  // ==========================================================================
  {
    ruleId: 'sd_019_duplicate_detector_suspect',
    name: 'Flag potential duplicate products',
    description: 'Flag products that might be duplicates based on naming patterns.',
    enabled: true,
    priority: 820,
    tags: ['quality', 'duplicate', 'review-needed'],
    condition: {
      source: 'source.rics.shortDescription',
      matchType: 'regex',
      value: '(?i)\\bcopy\\b|\\bdupe\\b|\\b(v|ver|version)?\\s*[2-9]\\b|\\breissue\\b|\\bretro\\b',
      options: { caseInsensitive: true },
    },
    action: {
      targetField: 'attributes.reviewFlag',
      valueTemplate: 'potential_duplicate',
      confidenceModifier: 0.7,
    },
    autoApply: false,
    autoApplyConfidence: 0.0,
  },

  // ==========================================================================
  // sd_020: Promotional Allowed Mapping
  // ==========================================================================
  {
    ruleId: 'sd_020_promotional_allowed_map',
    name: 'Set promotional eligibility based on brand/category',
    description: 'Some brands (Nike, Jordan) have MAP restrictions on promotions.',
    enabled: true,
    priority: 810,
    tags: ['pricing', 'promo', 'compliance'],
    condition: {
      source: 'sku_core.brand',
      matchType: 'in',
      value: ['Nike', 'Jordan', 'Air Jordan', 'Yeezy', 'Supreme'],
    },
    action: {
      targetField: 'attributes.promoAllowed',
      valueTemplate: 'false',
      confidenceModifier: 1.0,
    },
    autoApply: true,
    autoApplyConfidence: 0.95,
  },
];

/**
 * Export as JSON-ready format for Firestore seeding
 */
export function getRulesAsJSON(): string {
  return JSON.stringify(CANONICAL_RULES, null, 2);
}

/**
 * Get rules grouped by tag
 */
export function getRulesByTag(tag: string): SmartRule[] {
  return CANONICAL_RULES.filter(rule => rule.tags?.includes(tag));
}

/**
 * Get rule by ID
 */
export function getRuleById(ruleId: string): SmartRule | undefined {
  return CANONICAL_RULES.find(rule => rule.ruleId === ruleId);
}

export default CANONICAL_RULES;
