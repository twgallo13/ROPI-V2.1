/**
 * Shared types for structured AI output (Task 3)
 * Used by both Functions (backend) and front-end
 */

/**
 * Plain text/markdown per section
 */
export interface ROPISectionText {
  hero?: string;
  keyFeatures?: string[];
  fitAndSizing?: string;
  styleNotes?: string;
  techSpecs?: string;
  familySizing?: string;
  careInstructions?: string;
  [key: string]: string | string[] | undefined;
}

/**
 * FAQ item with question and answer
 */
export interface ROPIFaqItem {
  question: string;
  answer: string;
}

/**
 * SEO metadata
 */
export interface ROPISeo {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
}

/**
 * Structured description with all sections
 */
export interface ROPIStructuredDescription {
  hero?: string;
  keyFeatures?: string[];
  fitAndSizing?: string;
  styleNotes?: string;
  techSpecs?: string;
  familySizing?: string;
  careInstructions?: string;
  seo?: ROPISeo;
  faq?: ROPIFaqItem[];
}

/**
 * Final HTML blocks per section
 */
export interface ROPIHtmlBlocks {
  hero?: string;
  keyFeatures?: string;
  fitAndSizing?: string;
  styleNotes?: string;
  techSpecs?: string;
  familySizing?: string;
  careInstructions?: string;
  faq?: string;
}

/**
 * Final rendered result from renderRopiHtml
 */
export interface RopiHtmlResult {
  descriptionHtml: string;  // Full combined HTML
  blocks: ROPIHtmlBlocks;    // Per-section HTML
  seo: ROPISeo;              // SEO metadata
}

/**
 * Category groups for rendering logic
 */
export type CategoryGroup =
  | 'footwear_adult'
  | 'footwear_gs'
  | 'footwear_toddler'
  | 'apparel'
  | 'accessories'
  | 'default';

/**
 * Input parameters for renderRopiHtml function
 */
export interface RenderRopiHtmlParams {
  categoryGroup: CategoryGroup;
  structured: ROPIStructuredDescription;
  product: {
    familySizing?: boolean;
    [key: string]: any;
  };
}
