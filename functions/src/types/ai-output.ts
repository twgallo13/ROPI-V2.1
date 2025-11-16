/**
 * Local copy of shared AI output types for Cloud Functions build isolation.
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
export interface ROPIFaqItem { question: string; answer: string; }
export interface ROPISeo { metaTitle: string; metaDescription: string; keywords: string[]; }
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
export interface RopiHtmlResult { descriptionHtml: string; blocks: ROPIHtmlBlocks; seo: ROPISeo; }
export type CategoryGroup = 'footwear_adult' | 'footwear_gs' | 'footwear_toddler' | 'apparel' | 'accessories' | 'default';
export interface RenderRopiHtmlParams { categoryGroup: CategoryGroup; structured: ROPIStructuredDescription; product: { familySizing?: boolean; [key: string]: any; }; }
