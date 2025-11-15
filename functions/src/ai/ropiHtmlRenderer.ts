/**
 * ROPI HTML Renderer (Task 3.3)
 * Converts structured AI output into category-specific HTML
 * Backend implementation for Cloud Functions
 */

import type {
  ROPIStructuredDescription,
  ROPIHtmlBlocks,
  ROPISeo,
  RopiHtmlResult,
  CategoryGroup,
  RenderRopiHtmlParams
} from '../../../src/types/ai-output';

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Render key features as HTML list
 */
function renderKeyFeatures(features?: string[]): string {
  if (!features || features.length === 0) return '';
  
  const items = features.map(f => `  <li>${escapeHtml(f)}</li>`).join('\n');
  return `<ul>\n${items}\n</ul>`;
}

/**
 * Render FAQ as HTML
 */
function renderFaq(faq?: Array<{question: string; answer: string}>): string {
  if (!faq || faq.length === 0) return '';
  
  const items = faq.map(item => 
    `  <div class="faq-item">\n    <h4>${escapeHtml(item.question)}</h4>\n    <p>${escapeHtml(item.answer)}</p>\n  </div>`
  ).join('\n');
  
  return `<div class="faq">\n${items}\n</div>`;
}

/**
 * Render footwear for adults
 */
function renderFootwearAdult(
  structured: ROPIStructuredDescription,
  product: any
): RopiHtmlResult {
  const blocks: ROPIHtmlBlocks = {};
  const sections: string[] = [];

  // Hero section
  if (structured.hero) {
    blocks.hero = `<h2>Overview</h2>\n<p>${escapeHtml(structured.hero)}</p>`;
    sections.push(blocks.hero);
  }

  // Key Features
  if (structured.keyFeatures && structured.keyFeatures.length > 0) {
    blocks.keyFeatures = `<h3>Key Features</h3>\n${renderKeyFeatures(structured.keyFeatures)}`;
    sections.push(blocks.keyFeatures);
  }

  // Tech Specs
  if (structured.techSpecs) {
    blocks.techSpecs = `<h3>Technical Specifications</h3>\n<p>${escapeHtml(structured.techSpecs)}</p>`;
    sections.push(blocks.techSpecs);
  }

  // Fit and Sizing
  if (structured.fitAndSizing) {
    blocks.fitAndSizing = `<h3>Fit & Sizing</h3>\n<p>${escapeHtml(structured.fitAndSizing)}</p>`;
    sections.push(blocks.fitAndSizing);
  }

  // Style Notes
  if (structured.styleNotes) {
    blocks.styleNotes = `<h3>Style Notes</h3>\n<p>${escapeHtml(structured.styleNotes)}</p>`;
    sections.push(blocks.styleNotes);
  }

  // Family Sizing (only if product has familySizing flag)
  if (structured.familySizing && product.familySizing) {
    blocks.familySizing = `<h3>Family Sizing</h3>\n<p>${escapeHtml(structured.familySizing)}</p>`;
    sections.push(blocks.familySizing);
  }

  // Care Instructions
  if (structured.careInstructions) {
    blocks.careInstructions = `<h3>Care Instructions</h3>\n<p>${escapeHtml(structured.careInstructions)}</p>`;
    sections.push(blocks.careInstructions);
  }

  // FAQ
  if (structured.faq && structured.faq.length > 0) {
    blocks.faq = `<h3>Frequently Asked Questions</h3>\n${renderFaq(structured.faq)}`;
    sections.push(blocks.faq);
  }

  // Combine all sections
  const descriptionHtml = sections.join('\n\n');

  // SEO with validation
  const seo: ROPISeo = {
    metaTitle: (structured.seo?.metaTitle || '').substring(0, 60),
    metaDescription: (structured.seo?.metaDescription || '').substring(0, 155),
    keywords: structured.seo?.keywords || []
  };

  return { descriptionHtml, blocks, seo };
}

/**
 * Render footwear for grade school (GS)
 */
function renderFootwearGs(
  structured: ROPIStructuredDescription,
  product: any
): RopiHtmlResult {
  const blocks: ROPIHtmlBlocks = {};
  const sections: string[] = [];

  // Hero section
  if (structured.hero) {
    blocks.hero = `<h2>Perfect for Active Kids</h2>\n<p>${escapeHtml(structured.hero)}</p>`;
    sections.push(blocks.hero);
  }

  // Key Features
  if (structured.keyFeatures && structured.keyFeatures.length > 0) {
    blocks.keyFeatures = `<h3>What Makes Them Special</h3>\n${renderKeyFeatures(structured.keyFeatures)}`;
    sections.push(blocks.keyFeatures);
  }

  // Fit and Sizing
  if (structured.fitAndSizing) {
    blocks.fitAndSizing = `<h3>Sizing for Growing Feet</h3>\n<p>${escapeHtml(structured.fitAndSizing)}</p>`;
    sections.push(blocks.fitAndSizing);
  }

  // Style Notes
  if (structured.styleNotes) {
    blocks.styleNotes = `<h3>Style</h3>\n<p>${escapeHtml(structured.styleNotes)}</p>`;
    sections.push(blocks.styleNotes);
  }

  // Family Sizing
  if (structured.familySizing && product.familySizing) {
    blocks.familySizing = `<h3>Available for the Whole Family</h3>\n<p>${escapeHtml(structured.familySizing)}</p>`;
    sections.push(blocks.familySizing);
  }

  // Care Instructions
  if (structured.careInstructions) {
    blocks.careInstructions = `<h3>Easy Care</h3>\n<p>${escapeHtml(structured.careInstructions)}</p>`;
    sections.push(blocks.careInstructions);
  }

  const descriptionHtml = sections.join('\n\n');

  const seo: ROPISeo = {
    metaTitle: (structured.seo?.metaTitle || '').substring(0, 60),
    metaDescription: (structured.seo?.metaDescription || '').substring(0, 155),
    keywords: structured.seo?.keywords || []
  };

  return { descriptionHtml, blocks, seo };
}

/**
 * Render footwear for toddlers
 */
function renderFootwearToddler(
  structured: ROPIStructuredDescription,
  product: any
): RopiHtmlResult {
  const blocks: ROPIHtmlBlocks = {};
  const sections: string[] = [];

  // Hero section
  if (structured.hero) {
    blocks.hero = `<h2>Designed for Little Ones</h2>\n<p>${escapeHtml(structured.hero)}</p>`;
    sections.push(blocks.hero);
  }

  // Key Features (focus on comfort and safety)
  if (structured.keyFeatures && structured.keyFeatures.length > 0) {
    blocks.keyFeatures = `<h3>Comfort & Safety Features</h3>\n${renderKeyFeatures(structured.keyFeatures)}`;
    sections.push(blocks.keyFeatures);
  }

  // Fit and Sizing
  if (structured.fitAndSizing) {
    blocks.fitAndSizing = `<h3>Perfect Fit for Growing Feet</h3>\n<p>${escapeHtml(structured.fitAndSizing)}</p>`;
    sections.push(blocks.fitAndSizing);
  }

  // Care Instructions (important for parents)
  if (structured.careInstructions) {
    blocks.careInstructions = `<h3>Easy to Clean</h3>\n<p>${escapeHtml(structured.careInstructions)}</p>`;
    sections.push(blocks.careInstructions);
  }

  // Family Sizing
  if (structured.familySizing && product.familySizing) {
    blocks.familySizing = `<h3>Available for the Whole Family</h3>\n<p>${escapeHtml(structured.familySizing)}</p>`;
    sections.push(blocks.familySizing);
  }

  const descriptionHtml = sections.join('\n\n');

  const seo: ROPISeo = {
    metaTitle: (structured.seo?.metaTitle || '').substring(0, 60),
    metaDescription: (structured.seo?.metaDescription || '').substring(0, 155),
    keywords: structured.seo?.keywords || []
  };

  return { descriptionHtml, blocks, seo };
}

/**
 * Render apparel
 */
function renderApparel(
  structured: ROPIStructuredDescription,
  product: any
): RopiHtmlResult {
  const blocks: ROPIHtmlBlocks = {};
  const sections: string[] = [];

  // Hero section
  if (structured.hero) {
    blocks.hero = `<h2>Style Meets Comfort</h2>\n<p>${escapeHtml(structured.hero)}</p>`;
    sections.push(blocks.hero);
  }

  // Key Features
  if (structured.keyFeatures && structured.keyFeatures.length > 0) {
    blocks.keyFeatures = `<h3>Features</h3>\n${renderKeyFeatures(structured.keyFeatures)}`;
    sections.push(blocks.keyFeatures);
  }

  // Fit and Sizing
  if (structured.fitAndSizing) {
    blocks.fitAndSizing = `<h3>Fit & Sizing</h3>\n<p>${escapeHtml(structured.fitAndSizing)}</p>`;
    sections.push(blocks.fitAndSizing);
  }

  // Tech Specs (fabric, materials)
  if (structured.techSpecs) {
    blocks.techSpecs = `<h3>Fabric & Materials</h3>\n<p>${escapeHtml(structured.techSpecs)}</p>`;
    sections.push(blocks.techSpecs);
  }

  // Style Notes
  if (structured.styleNotes) {
    blocks.styleNotes = `<h3>Styling Tips</h3>\n<p>${escapeHtml(structured.styleNotes)}</p>`;
    sections.push(blocks.styleNotes);
  }

  // Care Instructions
  if (structured.careInstructions) {
    blocks.careInstructions = `<h3>Care Instructions</h3>\n<p>${escapeHtml(structured.careInstructions)}</p>`;
    sections.push(blocks.careInstructions);
  }

  const descriptionHtml = sections.join('\n\n');

  const seo: ROPISeo = {
    metaTitle: (structured.seo?.metaTitle || '').substring(0, 60),
    metaDescription: (structured.seo?.metaDescription || '').substring(0, 155),
    keywords: structured.seo?.keywords || []
  };

  return { descriptionHtml, blocks, seo };
}

/**
 * Render accessories
 */
function renderAccessories(
  structured: ROPIStructuredDescription,
  product: any
): RopiHtmlResult {
  const blocks: ROPIHtmlBlocks = {};
  const sections: string[] = [];

  // Hero section
  if (structured.hero) {
    blocks.hero = `<h2>The Perfect Finishing Touch</h2>\n<p>${escapeHtml(structured.hero)}</p>`;
    sections.push(blocks.hero);
  }

  // Key Features
  if (structured.keyFeatures && structured.keyFeatures.length > 0) {
    blocks.keyFeatures = `<h3>Features</h3>\n${renderKeyFeatures(structured.keyFeatures)}`;
    sections.push(blocks.keyFeatures);
  }

  // Tech Specs
  if (structured.techSpecs) {
    blocks.techSpecs = `<h3>Details</h3>\n<p>${escapeHtml(structured.techSpecs)}</p>`;
    sections.push(blocks.techSpecs);
  }

  // Style Notes
  if (structured.styleNotes) {
    blocks.styleNotes = `<h3>Style Tips</h3>\n<p>${escapeHtml(structured.styleNotes)}</p>`;
    sections.push(blocks.styleNotes);
  }

  // Care Instructions
  if (structured.careInstructions) {
    blocks.careInstructions = `<h3>Care</h3>\n<p>${escapeHtml(structured.careInstructions)}</p>`;
    sections.push(blocks.careInstructions);
  }

  const descriptionHtml = sections.join('\n\n');

  const seo: ROPISeo = {
    metaTitle: (structured.seo?.metaTitle || '').substring(0, 60),
    metaDescription: (structured.seo?.metaDescription || '').substring(0, 155),
    keywords: structured.seo?.keywords || []
  };

  return { descriptionHtml, blocks, seo };
}

/**
 * Default renderer (fallback)
 */
function renderDefault(
  structured: ROPIStructuredDescription,
  product: any
): RopiHtmlResult {
  const blocks: ROPIHtmlBlocks = {};
  const sections: string[] = [];

  // Include all sections in order
  if (structured.hero) {
    blocks.hero = `<p>${escapeHtml(structured.hero)}</p>`;
    sections.push(blocks.hero);
  }

  if (structured.keyFeatures && structured.keyFeatures.length > 0) {
    blocks.keyFeatures = `<h3>Key Features</h3>\n${renderKeyFeatures(structured.keyFeatures)}`;
    sections.push(blocks.keyFeatures);
  }

  if (structured.fitAndSizing) {
    blocks.fitAndSizing = `<h3>Fit & Sizing</h3>\n<p>${escapeHtml(structured.fitAndSizing)}</p>`;
    sections.push(blocks.fitAndSizing);
  }

  if (structured.styleNotes) {
    blocks.styleNotes = `<h3>Style</h3>\n<p>${escapeHtml(structured.styleNotes)}</p>`;
    sections.push(blocks.styleNotes);
  }

  if (structured.techSpecs) {
    blocks.techSpecs = `<h3>Specifications</h3>\n<p>${escapeHtml(structured.techSpecs)}</p>`;
    sections.push(blocks.techSpecs);
  }

  if (structured.familySizing && product.familySizing) {
    blocks.familySizing = `<h3>Family Sizing</h3>\n<p>${escapeHtml(structured.familySizing)}</p>`;
    sections.push(blocks.familySizing);
  }

  if (structured.careInstructions) {
    blocks.careInstructions = `<h3>Care</h3>\n<p>${escapeHtml(structured.careInstructions)}</p>`;
    sections.push(blocks.careInstructions);
  }

  if (structured.faq && structured.faq.length > 0) {
    blocks.faq = `<h3>FAQ</h3>\n${renderFaq(structured.faq)}`;
    sections.push(blocks.faq);
  }

  const descriptionHtml = sections.join('\n\n');

  const seo: ROPISeo = {
    metaTitle: (structured.seo?.metaTitle || '').substring(0, 60),
    metaDescription: (structured.seo?.metaDescription || '').substring(0, 155),
    keywords: structured.seo?.keywords || []
  };

  return { descriptionHtml, blocks, seo };
}

/**
 * Main renderRopiHtml function
 * Routes to category-specific renderers
 */
export function renderRopiHtml(params: RenderRopiHtmlParams): RopiHtmlResult {
  const { categoryGroup, structured, product } = params;

  switch (categoryGroup) {
    case 'footwear_adult':
      return renderFootwearAdult(structured, product);
    case 'footwear_gs':
      return renderFootwearGs(structured, product);
    case 'footwear_toddler':
      return renderFootwearToddler(structured, product);
    case 'apparel':
      return renderApparel(structured, product);
    case 'accessories':
      return renderAccessories(structured, product);
    default:
      return renderDefault(structured, product);
  }
}
