/**
 * Smart Detect - Rule-based field suggestions from RICS data
 */

export interface SmartDetectSuggestion {
  fieldPath: string;
  currentValue: any;
  suggestedValue: any;
  confidence: number; // 0-1
  reason: string;
}

export interface SmartDetectResult {
  suggestions: SmartDetectSuggestion[];
  summary: string;
}

/**
 * Smart Detect Rules Engine
 * Analyzes product data and suggests field values based on RICS and patterns
 */
export function runSmartDetect(product: any): SmartDetectResult {
  const suggestions: SmartDetectSuggestion[] = [];
  
  // Extract RICS data for analysis
  const rics = product.rics || {};
  const category = rics.category || '';
  const longDescription = rics.longDescription || '';
  const shortDescription = rics.shortDescription || '';
  const vendorStyleName = rics.vendorStyleName || product.name || '';
  
  // Rule 1: Department from RICS Category
  if (category && !product.department) {
    const categoryParts = category.split('|');
    if (categoryParts.length >= 2) {
      const ricsDept = categoryParts[1]; // M|FTW|... -> FTW
      let suggestedDept = '';
      
      switch (ricsDept) {
        case 'FTW':
          suggestedDept = 'Footwear';
          break;
        case 'APP':
          suggestedDept = 'Apparel';
          break;
        case 'ACC':
          suggestedDept = 'Accessories';
          break;
        default:
          suggestedDept = ricsDept;
      }
      
      if (suggestedDept) {
        suggestions.push({
          fieldPath: 'sku_core.department',
          currentValue: product.department,
          suggestedValue: suggestedDept,
          confidence: 0.95,
          reason: `From RICS category "${category}"`
        });
      }
    }
  }
  
  // Rule 2: Class from RICS Category
  if (category && !product.class) {
    const categoryParts = category.split('|');
    if (categoryParts.length >= 3) {
      const ricsClass = categoryParts[2]; // M|FTW|BASKETBALL|... -> BASKETBALL
      let suggestedClass = '';
      
      switch (ricsClass) {
        case 'BASKETBALL':
          suggestedClass = 'Athletic';
          break;
        case 'RUNNING':
          suggestedClass = 'Athletic';
          break;
        case 'CASUAL':
          suggestedClass = 'Casual';
          break;
        case 'DRESS':
          suggestedClass = 'Dress';
          break;
        default:
          suggestedClass = ricsClass.toLowerCase().replace(/^\\w/, (c: string) => c.toUpperCase());
      }
      
      if (suggestedClass) {
        suggestions.push({
          fieldPath: 'sku_core.class',
          currentValue: product.class,
          suggestedValue: suggestedClass,
          confidence: 0.9,
          reason: `From RICS category "${category}"`
        });
      }
    }
  }
  
  // Rule 3: Age Group from RICS Category
  if (category && !product.ageGroup) {
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
          currentValue: product.ageGroup,
          suggestedValue: suggestedAge,
          confidence: 0.85,
          reason: `From RICS category "${category}"`
        });
      }
    }
  }
  
  // Rule 4: Gender from RICS Category first letter
  if (category && !product.gender) {
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
    }
    
    if (suggestedGender) {
      suggestions.push({
        fieldPath: 'descriptive.gender',
        currentValue: product.gender,
        suggestedValue: suggestedGender,
        confidence: 0.9,
        reason: `From RICS category gender code "${genderCode}"`
      });
    }
  }
  
  // Rule 5: Materials from Long Description
  if (longDescription && (!product.material || product.material.length === 0)) {
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
      { keyword: /polyester/i, material: 'Polyester' }
    ];
    
    const foundMaterials = materialKeywords
      .filter(m => m.keyword.test(longDescription))
      .map(m => m.material);
    
    if (foundMaterials.length > 0) {
      suggestions.push({
        fieldPath: 'descriptive.material',
        currentValue: product.material,
        suggestedValue: foundMaterials,
        confidence: 0.8,
        reason: `Materials detected in RICS description: ${foundMaterials.join(', ')}`
      });
    }
  }
  
  // Rule 6: Brand from vendor style name or RICS data
  if (!product.brand && (vendorStyleName || rics.brand)) {
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
          currentValue: product.brand,
          suggestedValue: foundBrand,
          confidence: 0.85,
          reason: `Brand detected in RICS data: "${foundBrand}"`
        });
        break;
      }
    }
  }
  
  // Rule 7: Primary Color from description
  if (longDescription && !product.primaryColor) {
    const colorKeywords = [
      { keyword: /\\bblack\\b/i, color: 'Black' },
      { keyword: /\\bwhite\\b/i, color: 'White' },
      { keyword: /\\bred\\b/i, color: 'Red' },
      { keyword: /\\bblue\\b/i, color: 'Blue' },
      { keyword: /\\bgreen\\b/i, color: 'Green' },
      { keyword: /\\byellow\\b/i, color: 'Yellow' },
      { keyword: /\\bpink\\b/i, color: 'Pink' },
      { keyword: /\\bpurple\\b/i, color: 'Purple' },
      { keyword: /\\borange\\b/i, color: 'Orange' },
      { keyword: /\\bgray|grey\\b/i, color: 'Gray' },
      { keyword: /\\bbrown\\b/i, color: 'Brown' },
      { keyword: /\\bnavy\\b/i, color: 'Navy' }
    ];
    
    const foundColor = colorKeywords.find(c => c.keyword.test(longDescription));
    if (foundColor) {
      suggestions.push({
        fieldPath: 'descriptive.primaryColor',
        currentValue: product.primaryColor,
        suggestedValue: foundColor.color,
        confidence: 0.7,
        reason: `Color detected in RICS description: "${foundColor.color}"`
      });
    }
  }
  
  // Rule 8: Sports Team Detection
  if ((longDescription || vendorStyleName) && !product.sportsTeam) {
    const teamKeywords = [
      'Lakers', 'Warriors', 'Bulls', 'Celtics', 'Heat', 'Knicks',
      'Cowboys', 'Patriots', 'Packers', 'Steelers', 'Giants', 'Eagles',
      'Yankees', 'Red Sox', 'Dodgers', 'Mets', 'Cubs', 'Cardinals'
    ];
    
    const searchText = `${longDescription} ${vendorStyleName}`.toLowerCase();
    const foundTeam = teamKeywords.find(team => 
      searchText.includes(team.toLowerCase())
    );
    
    if (foundTeam) {
      suggestions.push({
        fieldPath: 'descriptive.sportsTeam',
        currentValue: product.sportsTeam,
        suggestedValue: foundTeam,
        confidence: 0.8,
        reason: `Team detected in product data: "${foundTeam}"`
      });
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