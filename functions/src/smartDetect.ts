/**
 * Smart Detect - Rule-based field suggestions from RICS data
 */

export interface SmartDetectSuggestion {
  fieldPath: string;
  currentValue: any;
  suggestedValue: any;
  confidence: number; // 0-1
  reason: string;
  ruleId: string;
  ruleName: string;
  autoApply: boolean; // Whether to auto-apply this suggestion
}

export interface SmartDetectResult {
  suggestions: SmartDetectSuggestion[];
  summary: string;
}

/**
 * Normalize color strings to title case
 */
function normalizeColor(color: string): string {
  if (!color) return '';
  return color
    .toLowerCase()
    .split(/[\s\-\_]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Normalize general strings to title case
 */
function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[\_\-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Department mapping from RICS category codes
 */
const DEPARTMENT_MAP: Record<string, string> = {
  'FTW': 'Footwear',
  'APP': 'Apparel',
  'ACC': 'Accessories',
  'EQP': 'Equipment',
  'TOY': 'Toys',
};

/**
 * Class mapping from RICS category codes
 */
const CLASS_MAP: Record<string, string> = {
  'BASKETBALL': 'Athletic',
  'RUNNING': 'Athletic',
  'TRAINING': 'Athletic',
  'SOCCER': 'Athletic',
  'FOOTBALL': 'Athletic',
  'BASEBALL': 'Athletic',
  'CASUAL': 'Casual',
  'DRESS': 'Dress',
  'SANDALS': 'Sandals',
  'BOOTS': 'Boots',
  'SNEAKERS': 'Sneakers',
};

/**
 * League keywords for detection
 */
const LEAGUE_KEYWORDS: Record<string, string> = {
  'nba': 'NBA',
  'nfl': 'NFL',
  'mlb': 'MLB',
  'nhl': 'NHL',
  'mls': 'MLS',
  'ncaa': 'NCAA',
};

/**
 * Smart Detect Rules Engine
 * Analyzes product data and suggests field values based on RICS and patterns
 * Supports new schema via sku/descr and legacy via product.
 */
export function runSmartDetect(product: any): SmartDetectResult {
  const suggestions: SmartDetectSuggestion[] = [];
  
  // Support canonical schema: prefer nested structure, fallback to legacy
  const sku = product.sku_core || product;
  const descr = product.descriptive || product;
  const rics = (product.source && product.source.rics) || product.rics || {};
  const category = rics.category || '';
  const longDescription = rics.longDescription || descr.description || '';
  const shortDescription = rics.shortDescription || '';
  const ricsColor = rics.color || rics.RICSColor || '';
  const vendorStyleName = rics.vendorStyleName || sku.name || product.name || '';
  
  // Rule 1: Department from RICS Category → sku_core.department
  // Confidence: 0.95, autoApply: true
  if (category && !sku.department) {
    const categoryParts = category.split('|');
    if (categoryParts.length >= 2) {
      const ricsDept = categoryParts[1]; // M|FTW|... -> FTW
      const suggestedDept = DEPARTMENT_MAP[ricsDept] || normalizeString(ricsDept);
      
      if (suggestedDept) {
        suggestions.push({
          fieldPath: 'sku_core.department',
          currentValue: sku.department,
          suggestedValue: suggestedDept,
          confidence: 0.95,
          reason: `From RICS category "${category}"`,
          ruleId: 'SD-001',
          ruleName: 'Department from RICS Category',
          autoApply: true,
        });
      }
    }
  }
  
  // Rule 2: Class from RICS Category → sku_core.class
  // Confidence: 0.90, autoApply: true
  if (category && !sku.class) {
    const categoryParts = category.split('|');
    if (categoryParts.length >= 3) {
      const ricsClass = categoryParts[2]; // M|FTW|BASKETBALL|... -> BASKETBALL
      const suggestedClass = CLASS_MAP[ricsClass] || normalizeString(ricsClass);
      
      if (suggestedClass) {
        suggestions.push({
          fieldPath: 'sku_core.class',
          currentValue: sku.class,
          suggestedValue: suggestedClass,
          confidence: 0.9,
          reason: `From RICS category "${category}"`,
          ruleId: 'SD-002',
          ruleName: 'Class from RICS Category',
          autoApply: true,
        });
      }
    }
  }
  
  // Rule 3: Age Group from RICS Category → descriptive.ageGroup
  // Confidence: 0.85, autoApply: false
  if (category && !descr.ageGroup) {
    const categoryParts = category.split('|');
    if (categoryParts.length >= 4) {
      const ricsAge = categoryParts[3]; // M|FTW|BASKETBALL|YOUTH -> YOUTH
      let suggestedAge = '';
      
      switch (ricsAge) {
        case 'YOUTH':
        case 'GS':
          suggestedAge = 'Grade School';
          break;
        case 'ADULT':
          suggestedAge = 'Adult';
          break;
        case 'TODDLER':
          suggestedAge = 'Toddler';
          break;
        case 'INFANT':
          suggestedAge = 'Infant';
          break;
      }
      
      if (suggestedAge) {
        suggestions.push({
          fieldPath: 'descriptive.ageGroup',
          currentValue: descr.ageGroup,
          suggestedValue: suggestedAge,
          confidence: 0.85,
          reason: `From RICS category "${category}"`,
          ruleId: 'SD-003',
          ruleName: 'Age Group from RICS Category',
          autoApply: false,
        });
      }
    }
  }
  
  // Rule 4: Gender from RICS Category first letter → descriptive.gender
  // Confidence: 0.9, autoApply: true
  if (category && !descr.gender) {
    const genderCode = category.charAt(0); // M|FTW|... -> M
    let suggestedGender = '';
    
    switch (genderCode) {
      case 'M':
        suggestedGender = "Men's";
        break;
      case 'W':
        suggestedGender = "Women's";
        break;
      case 'U':
        suggestedGender = 'Unisex';
        break;
      case 'B':
        suggestedGender = "Boys'";
        break;
      case 'G':
        suggestedGender = "Girls'";
        break;
    }
    
    if (suggestedGender) {
      suggestions.push({
        fieldPath: 'descriptive.gender',
        currentValue: descr.gender,
        suggestedValue: suggestedGender,
        confidence: 0.9,
        reason: `From RICS category gender code "${genderCode}"`,
        ruleId: 'SD-004',
        ruleName: 'Gender from RICS Category',
        autoApply: true,
      });
    }
  }
  
  // Rule 5: Sports Team from RICS longDescription/vendorStyleName → descriptive.sportsTeam
  // Confidence: 0.8, autoApply: false
  if ((longDescription || vendorStyleName) && !descr.sportsTeam) {
    const teamKeywords = [
      'Lakers', 'Warriors', 'Bulls', 'Celtics', 'Heat', 'Knicks', 'Nets', 'Sixers',
      'Cowboys', 'Patriots', 'Packers', 'Steelers', 'Giants', 'Eagles', '49ers', 'Chiefs',
      'Yankees', 'Red Sox', 'Dodgers', 'Mets', 'Cubs', 'Cardinals', 'Astros', 'Braves'
    ];
    
    const searchText = `${longDescription} ${vendorStyleName}`.toLowerCase();
    const foundTeam = teamKeywords.find(team => 
      searchText.includes(team.toLowerCase())
    );
    
    if (foundTeam) {
      suggestions.push({
        fieldPath: 'descriptive.sportsTeam',
        currentValue: descr.sportsTeam,
        suggestedValue: foundTeam,
        confidence: 0.8,
        reason: `Team detected in product data: "${foundTeam}"`,
        ruleId: 'SD-005',
        ruleName: 'Sports Team Detection',
        autoApply: false,
      });
    }
  }
  
  // Rule 6: League from RICS attributes/longDescription → descriptive.league
  // Confidence: 0.85, autoApply: false
  if ((longDescription || vendorStyleName) && !descr.league) {
    const searchText = `${longDescription} ${vendorStyleName}`.toLowerCase();
    
    for (const [keyword, league] of Object.entries(LEAGUE_KEYWORDS)) {
      if (searchText.includes(keyword)) {
        suggestions.push({
          fieldPath: 'descriptive.league',
          currentValue: descr.league,
          suggestedValue: league,
          confidence: 0.85,
          reason: `League detected: "${league}"`,
          ruleId: 'SD-006',
          ruleName: 'League Detection',
          autoApply: false,
        });
        break;
      }
    }
  }
  
  // Rule 7: Primary Color from RICS color (preferred) else longDescription → descriptive.primaryColor
  // Confidence: 0.95 if from RICS color (autoApply: true), 0.7 from text (autoApply: false)
  if (!descr.primaryColor) {
    if (ricsColor) {
      // High confidence from structured RICS color field
      const normalizedColor = normalizeColor(ricsColor);
      if (normalizedColor) {
        suggestions.push({
          fieldPath: 'descriptive.primaryColor',
          currentValue: descr.primaryColor,
          suggestedValue: normalizedColor,
          confidence: 0.95,
          reason: `From RICS color field: "${ricsColor}"`,
          ruleId: 'SD-007',
          ruleName: 'Primary Color from RICS',
          autoApply: true,
        });
      }
    } else if (longDescription) {
      // Lower confidence from text description
      const colorKeywords = [
        { keyword: /\bblack\b/i, color: 'Black' },
        { keyword: /\bwhite\b/i, color: 'White' },
        { keyword: /\bred\b/i, color: 'Red' },
        { keyword: /\bblue\b/i, color: 'Blue' },
        { keyword: /\bgreen\b/i, color: 'Green' },
        { keyword: /\byellow\b/i, color: 'Yellow' },
        { keyword: /\bpink\b/i, color: 'Pink' },
        { keyword: /\bpurple\b/i, color: 'Purple' },
        { keyword: /\borange\b/i, color: 'Orange' },
        { keyword: /\bgray|grey\b/i, color: 'Gray' },
        { keyword: /\bbrown\b/i, color: 'Brown' },
        { keyword: /\bnavy\b/i, color: 'Navy' },
      ];
      
      const foundColor = colorKeywords.find(c => c.keyword.test(longDescription));
      if (foundColor) {
        suggestions.push({
          fieldPath: 'descriptive.primaryColor',
          currentValue: descr.primaryColor,
          suggestedValue: foundColor.color,
          confidence: 0.7,
          reason: `Color detected in RICS description: "${foundColor.color}"`,
          ruleId: 'SD-007B',
          ruleName: 'Primary Color from Description',
          autoApply: false,
        });
      }
    }
  }
  
  // Rule 8: Product Name from RICS shortDescription → sku_core.name
  // Confidence: 0.95, autoApply: true
  if (shortDescription && !sku.name) {
    suggestions.push({
      fieldPath: 'sku_core.name',
      currentValue: sku.name,
      suggestedValue: shortDescription,
      confidence: 0.95,
      reason: `From RICS short description`,
      ruleId: 'SD-008',
      ruleName: 'Product Name from RICS',
      autoApply: true,
    });
  }
  
  // Rule 9: Materials from longDescription keywords → descriptive.material (array)
  // Confidence: 0.8, autoApply: false
  if (longDescription && (!descr.material || descr.material.length === 0)) {
    const materialKeywords = [
      { keyword: /leather/i, material: 'Leather' },
      { keyword: /mesh/i, material: 'Mesh' },
      { keyword: /canvas/i, material: 'Canvas' },
      { keyword: /suede/i, material: 'Suede' },
      { keyword: /rubber/i, material: 'Rubber' },
      { keyword: /synthetic/i, material: 'Synthetic' },
      { keyword: /textile/i, material: 'Textile' },
      { keyword: /foam/i, material: 'Foam' },
      { keyword: /cotton/i, material: 'Cotton' },
      { keyword: /polyester/i, material: 'Polyester' },
      { keyword: /nylon/i, material: 'Nylon' },
      { keyword: /wool/i, material: 'Wool' },
    ];
    
    const foundMaterials = materialKeywords
      .filter(m => m.keyword.test(longDescription))
      .map(m => m.material);
    
    if (foundMaterials.length > 0) {
      suggestions.push({
        fieldPath: 'descriptive.material',
        currentValue: descr.material,
        suggestedValue: foundMaterials,
        confidence: 0.8,
        reason: `Materials detected in RICS description: ${foundMaterials.join(', ')}`,
        ruleId: 'SD-009',
        ruleName: 'Materials Detection',
        autoApply: false,
      });
    }
  }
  
  // Rule 10: Brand from vendor style name or RICS data → sku_core.brand
  // Keep existing logic but add autoApply: false
  if (!sku.brand && (vendorStyleName || rics.brand)) {
    const brandSources = [rics.brand, vendorStyleName].filter(Boolean);
    const brandKeywords = [
      'Nike', 'Adidas', 'Jordan', 'Puma', 'Reebok', 'New Balance', 'Converse',
      'Vans', 'Under Armour', 'FILA', 'Champion', 'Timberland', 'Doc Martens'
    ];
    
    for (const source of brandSources) {
      const foundBrand = brandKeywords.find(brand => 
        new RegExp(brand, 'i').test(source)
      );
      
      if (foundBrand) {
        suggestions.push({
          fieldPath: 'sku_core.brand',
          currentValue: sku.brand,
          suggestedValue: foundBrand,
          confidence: 0.85,
          reason: `Brand detected in RICS data: "${foundBrand}"`,
          ruleId: 'SD-010',
          ruleName: 'Brand Detection',
          autoApply: false,
        });
        break;
      }
    }
  }
  
  const summary = suggestions.length > 0 
    ? `${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'} found`
    : 'No suggestions available';
  
  return {
    suggestions,
    summary
  };
}