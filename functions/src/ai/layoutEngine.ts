/**
 * AI Layout Engine - Category-aware HTML block generation
 */

export interface LayoutBlocks {
  hero?: string;
  features?: string;
  fit?: string;
  techSpecs?: string;
  materials?: string;
  care?: string;
}

export interface LayoutEngineResult {
  templateKey: string;
  blocks: LayoutBlocks;
  html: string;
  metaName: string;
  metaDescription: string;
  slugSuggestion: string;
}

/**
 * Generate structured HTML layout based on product category and AI description
 */
export function generateLayout(
  product: any,
  aiDescription: string,
  templateKey: string
): LayoutEngineResult {
  
  const department = product.sku_core?.department || product.department || '';
  const category = product.sku_core?.category || product.category || '';
  const ageGroup = product.descriptive?.ageGroup || product.ageGroup || '';
  const brand = product.sku_core?.brand || product.brand || '';
  const name = product.sku_core?.name || product.name || '';
  
  // Parse AI description into blocks (simple heuristic approach)
  const blocks: LayoutBlocks = parseDescriptionIntoBlocks(aiDescription, department);
  
  // Generate final HTML based on category
  const html = generateCategoryHTML(blocks, department, ageGroup);
  
  // Generate SEO metadata
  const metaName = generateMetaName(brand, name, category, ageGroup);
  const metaDescription = generateMetaDescription(blocks.hero || aiDescription, brand, name);
  const slugSuggestion = generateSlug(brand, name, category);
  
  return {
    templateKey,
    blocks,
    html,
    metaName,
    metaDescription,
    slugSuggestion
  };
}

/**
 * Parse AI description into semantic blocks
 */
function parseDescriptionIntoBlocks(description: string, department: string): LayoutBlocks {
  const blocks: LayoutBlocks = {};
  
  // Split description into sentences/paragraphs
  const sentences = description.split(/[.!?]\\s+/).filter(s => s.trim().length > 0);
  
  if (sentences.length === 0) {
    return { hero: description };
  }
  
  // First 1-2 sentences as hero
  blocks.hero = sentences.slice(0, Math.min(2, sentences.length)).join('. ') + '.';
  
  // Remaining content based on department
  const remainingSentences = sentences.slice(2);
  
  if (department === 'Footwear') {
    // Look for fit/comfort related content
    const fitSentences = remainingSentences.filter(s => 
      /\\b(fit|comfort|cushion|support|sole|heel)\\b/i.test(s)
    );
    
    if (fitSentences.length > 0) {
      blocks.fit = '<p>' + fitSentences.join('. ') + '.</p>';
    }
    
    // Look for material/tech specs
    const techSentences = remainingSentences.filter(s => 
      /\\b(material|leather|mesh|rubber|technology|air|zoom|boost)\\b/i.test(s)
    );
    
    if (techSentences.length > 0) {
      blocks.techSpecs = '<ul><li>' + techSentences.join('</li><li>') + '</li></ul>';
    }
  } else if (department === 'Apparel') {
    // Look for fit/sizing content
    const fitSentences = remainingSentences.filter(s => 
      /\\b(fit|size|length|sleeve|neck)\\b/i.test(s)
    );
    
    if (fitSentences.length > 0) {
      blocks.fit = '<p>' + fitSentences.join('. ') + '.</p>';
    }
    
    // Look for material content
    const materialSentences = remainingSentences.filter(s => 
      /\\b(cotton|polyester|blend|fabric|material|wash)\\b/i.test(s)
    );
    
    if (materialSentences.length > 0) {
      blocks.materials = '<p>' + materialSentences.join('. ') + '.</p>';
    }
  }
  
  // General features (remaining content)
  const featureSentences = remainingSentences.filter(s => 
    !blocks.fit?.includes(s) && !blocks.techSpecs?.includes(s) && !blocks.materials?.includes(s)
  );
  
  if (featureSentences.length > 0) {
    blocks.features = '<ul><li>' + featureSentences.join('</li><li>') + '</li></ul>';
  }
  
  return blocks;
}

/**
 * Generate category-specific HTML structure
 */
function generateCategoryHTML(blocks: LayoutBlocks, department: string, ageGroup: string): string {
  let html = '<div class="ropi-description">';
  
  // Hero section (always first)
  if (blocks.hero) {
    html += `<div class="ropi-hero">${blocks.hero}</div>`;
  }
  
  // Department-specific layout
  if (department === 'Footwear') {
    if (blocks.features) {
      html += `<div class="ropi-features"><h4>Key Features</h4>${blocks.features}</div>`;
    }
    
    if (blocks.fit) {
      html += `<div class="ropi-fit"><h4>Fit & Comfort</h4>${blocks.fit}</div>`;
    }
    
    if (blocks.techSpecs) {
      html += `<div class="ropi-tech"><h4>Technology & Materials</h4>${blocks.techSpecs}</div>`;
    }
  } else if (department === 'Apparel') {
    if (blocks.features) {
      html += `<div class="ropi-features"><h4>Features</h4>${blocks.features}</div>`;
    }
    
    if (blocks.materials) {
      html += `<div class="ropi-materials"><h4>Materials & Care</h4>${blocks.materials}</div>`;
    }
    
    if (blocks.fit) {
      html += `<div class="ropi-fit"><h4>Fit & Sizing</h4>${blocks.fit}</div>`;
    }
  } else {
    // Generic layout
    if (blocks.features) {
      html += `<div class="ropi-features"><h4>Features</h4>${blocks.features}</div>`;
    }
    
    if (blocks.techSpecs) {
      html += `<div class="ropi-specs"><h4>Specifications</h4>${blocks.techSpecs}</div>`;
    }
  }
  
  // Age-specific content
  if (ageGroup === 'Grade School' || ageGroup === 'Toddler' || ageGroup === 'Infant') {
    html += `<div class="ropi-youth"><p><em>Designed specifically for ${ageGroup.toLowerCase()} sizing and comfort.</em></p></div>`;
  }
  
  html += '</div>';
  
  return html;
}

/**
 * Generate SEO-optimized meta name
 */
function generateMetaName(brand: string, name: string, category: string, ageGroup: string): string {
  let metaName = '';
  
  if (brand) metaName += brand + ' ';
  if (name) metaName += name + ' ';
  
  // Add category context
  if (category && !name?.toLowerCase().includes(category.toLowerCase())) {
    metaName += category + ' ';
  }
  
  // Add age group if relevant
  if (ageGroup && ageGroup !== 'Adult') {
    const ageAbbrev = ageGroup === 'Grade School' ? 'GS' : ageGroup;
    metaName += ageAbbrev + ' ';
  }
  
  // Trim and ensure under 60 characters
  metaName = metaName.trim();
  if (metaName.length > 60) {
    metaName = metaName.substring(0, 57) + '...';
  }
  
  return metaName;
}

/**
 * Generate SEO-optimized meta description
 */
function generateMetaDescription(heroText: string, brand: string, name: string): string {
  let metaDesc = '';
  
  // Start with hero text
  if (heroText) {
    // Remove HTML tags and clean up
    metaDesc = heroText.replace(/<[^>]*>/g, '').trim();
  }
  
  // Add brand context if not already mentioned
  if (brand && !metaDesc.toLowerCase().includes(brand.toLowerCase())) {
    metaDesc = `${brand} ${metaDesc}`;
  }
  
  // Add call to action
  if (metaDesc && !metaDesc.includes('Shop') && !metaDesc.includes('Buy')) {
    metaDesc += ' Shop now for authentic quality and style.';
  }
  
  // Trim to 155 characters
  if (metaDesc.length > 155) {
    metaDesc = metaDesc.substring(0, 152) + '...';
  }
  
  return metaDesc;
}

/**
 * Generate URL slug
 */
function generateSlug(brand: string, name: string, category: string): string {
  let slug = '';
  
  if (brand) slug += brand + '-';
  if (name) slug += name + '-';
  if (category) slug += category;
  
  // Clean and format slug
  slug = slug
    .toLowerCase()
    .replace(/[^a-z0-9\\s-]/g, '') // Remove special characters
    .replace(/\\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-')          // Remove duplicate hyphens
    .replace(/^-|-$/g, '');       // Remove leading/trailing hyphens
  
  return slug;
}