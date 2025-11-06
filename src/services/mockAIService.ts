export interface AIGenerationResult {
  title: string;
  bullets: string[];
  seo: string;
  paragraphDraft: string;
  score: {
    overall: number;
    tone: number;
    seo: number;
  };
}

/**
 * Simulates calling an AI service to generate a product description.
 * @returns A promise that resolves with a mock AI generation result after a short delay.
 */
export const mockGenerateDescription = async (): Promise<AIGenerationResult> => {
  console.log('Mock AI Service: Starting generation...');

  return new Promise(resolve => {
    setTimeout(() => {
      console.log('Mock AI Service: Generation complete.');
      resolve({
        title: 'Mock AI Title',
        bullets: ['Mock bullet 1'],
        seo: 'Mock SEO desc',
        paragraphDraft: 'This is the mock AI-generated paragraph.',
        score: { overall: 9, tone: 8, seo: 10 },
      });
    }, 1000); // Simulate a 1-second network delay
  });
};