# Quick Reference: Enhanced AI Description Generation

## New API Payload Structure

```typescript
{
  productId: string;
  channel: 'RetailOps' | 'Shopify' | 'PDP';
  tone: 'Clean' | 'Hype' | 'Technical';
  length: 'Short' | 'Medium' | 'Long';
  temperature: number;  // 0.0-1.0, default 0.6
  
  facts: {
    observations?: string;
    materials?: string;
    fit?: string;
    keywords?: string[];
  };
  
  aiContext: {
    keywords?: string[];
    featureBullets?: string[];
    designNotes?: string;  // "Improve This" feedback
  };
  
  attributes: {
    name, brand, category, fit, gender, ageGroup,
    sportsTeam, league, material, 
    primaryColor, descriptiveColor,
    cutType, closureType, heelHeight, platformHeight,
    // ... all product attributes
  };
  
  imageUrl?: string;
}
```

## New API Response Structure

```typescript
{
  description: string;     // The generated description
  seo_score: number;       // 1-10 SEO quality rating
  tone_score: number;      // 1-10 tone match rating
  facts_used: string[];    // Which facts were used
  
  // Legacy fields (for backward compatibility):
  text?: string;           // Same as description
  title?: string;
  bullets?: string[];
}
```

## Vocabulary Normalization

The system automatically normalizes vocabulary terms before sending to AI:

| Input | Normalized Output |
|-------|-------------------|
| Mens | Men's |
| Womens | Women's |
| TTS | fits true to size |
| Athletic Fit | athletic fit |

All vocab from Firestore is automatically mapped using live data.

## Temperature Settings

| Value | Effect | Use Case |
|-------|--------|----------|
| 0.0-0.3 | Very consistent | Technical specs, formal copy |
| 0.4-0.6 | Balanced (default) | General retail copy |
| 0.7-1.0 | More creative | Marketing campaigns, hype copy |

## Score Interpretation

### SEO Score (1-10)
- **8-10**: Excellent - Rich keywords, good length, compelling
- **5-7**: Good - Adequate keywords, could be enhanced
- **1-4**: Poor - Lacks keywords or too generic

### Tone Score (1-10)
- **8-10**: Perfect match to requested tone
- **5-7**: Close but could be refined
- **1-4**: Misses the mark, regenerate

## Usage in Code

```typescript
import { describeProduct, DescribeProductPayload } from '../services/describe';
import { useVocab } from '../hooks/useVocab';

// Build vocab map
const vocab = useVocab();
const vocabMap = useMemo(() => buildVocabMap(vocab), [vocab]);

// Make request
const payload: DescribeProductPayload = {
  productId: 'ABC123',
  channel: 'RetailOps',
  tone: 'Clean',
  length: 'Medium',
  temperature: 0.6,
  facts: { ... },
  attributes: { ... }
};

const result = await describeProduct(payload, vocabMap);

// Use response
console.log(result.description);
console.log(`SEO: ${result.seo_score}/10`);
console.log(`Tone: ${result.tone_score}/10`);
console.log(`Facts used:`, result.facts_used);
```

## Firestore Storage

Generated descriptions are saved to:
```
products/{productId}/descriptions/{channel}
```

With structure:
```typescript
{
  text: string;
  seo_score: number;
  tone_score: number;
  facts_used: string[];
  meta: {
    tone: string;
    length: string;
    temperature: number;
    generatedAt: Timestamp;
  }
}
```

## Environment Setup

### Firebase Functions Config
```bash
firebase functions:config:set gemini.api_key="YOUR_API_KEY"
```

### Local Development (.env)
```
GEMINI_API_KEY=your_api_key_here
```

### Vite Frontend (.env)
```
VITE_GEMINI_API_KEY=your_api_key_here
```

## Error Handling

The system gracefully handles:
- Missing Gemini API key → Returns mock response
- JSON parsing errors → Falls back to plain text
- Network timeouts → 15s timeout with fallback
- Missing attributes → Uses sensible defaults

## Testing Checklist

- [ ] Generate description with all facts filled
- [ ] Generate with minimal data (name + brand only)
- [ ] Test different tones (Clean, Hype, Technical)
- [ ] Test different lengths (Short, Medium, Long)
- [ ] Adjust temperature and observe changes
- [ ] Use "Improve This" feedback
- [ ] Verify scores are displayed
- [ ] Check Firestore storage
- [ ] Test vocab normalization (use "Mens" → see "Men's")
- [ ] Test without Gemini API key (mock mode)
