// Export Gate Enforcement Implementation
// Implements completion-based export readiness with site-aware blocking

// Mock interfaces for dependencies (to be replaced with actual imports)
interface CompletionEngine {
  evaluate(productId: string, productData: any, selectedSites: string[]): Promise<{
    totalCompletionPct: number;
    siteCompletions: Array<{
      siteId: string;
      completionPct: number;
      missingAttributes: string[];
    }>;
    siteBlockingReasons: Array<{
      site: string;
      missingAttributes: string[];
    }>;
  }>;
}

interface AttributeRegistry {
  getAttributeTypes(): Promise<any>;
}

export interface ExportSettings {
  completionRules: {
    minimumCompletionPct: number;
    requiredSites: string[];
    blockingAttributes: {
      [siteId: string]: string[];
    };
  };
}

export interface ExportBlockingReason {
  type: 'COMPLETION_BELOW_THRESHOLD' | 'SITE_MISSING_REQUIRED';
  message: string;
  site?: string;
  missingAttributes?: string[];
  currentCompletion?: number;
  requiredCompletion?: number;
}

export interface ExportReadinessResult {
  canExport: boolean;
  completionPct: number;
  blockingReasons: ExportBlockingReason[];
  siteReadiness: {
    [siteId: string]: {
      ready: boolean;
      missingAttributes: string[];
    };
  };
}

export class ExportGateEnforcer {
  constructor(
    private completionEngine: CompletionEngine,
    private attributeRegistry: AttributeRegistry
  ) {}

  async evaluateExportReadiness(
    productId: string,
    productData: any,
    selectedSites: string[],
    exportSettings: ExportSettings
  ): Promise<ExportReadinessResult> {
    // Get completion evaluation
    const completion = await this.completionEngine.evaluate(productId, productData, selectedSites);
    
    const blockingReasons: ExportBlockingReason[] = [];
    const siteReadiness: { [siteId: string]: { ready: boolean; missingAttributes: string[] } } = {};
    
    // Check completion percentage threshold
    const minCompletion = exportSettings.completionRules.minimumCompletionPct;
    const isCompletionSufficient = completion.totalCompletionPct >= minCompletion;
    
    if (!isCompletionSufficient) {
      blockingReasons.push({
        type: 'COMPLETION_BELOW_THRESHOLD',
        message: `Completion ${completion.totalCompletionPct}% is below required ${minCompletion}%`,
        currentCompletion: completion.totalCompletionPct,
        requiredCompletion: minCompletion
      });
    }
    
    // Check site-specific requirements
    for (const siteId of selectedSites) {
      const siteCompletion = completion.siteCompletions.find(sc => sc.siteId === siteId);
      const missingAttributes = siteCompletion?.missingAttributes || [];
      
      const isReady = missingAttributes.length === 0;
      siteReadiness[siteId] = {
        ready: isReady,
        missingAttributes
      };
      
      if (!isReady) {
        blockingReasons.push({
          type: 'SITE_MISSING_REQUIRED',
          message: `Site ${siteId} missing required attributes: ${missingAttributes.join(', ')}`,
          site: siteId,
          missingAttributes
        });
      }
    }
    
    // Final export decision - blocked if ANY blocking reasons exist
    const canExport = blockingReasons.length === 0;
    
    return {
      canExport,
      completionPct: completion.totalCompletionPct,
      blockingReasons,
      siteReadiness
    };
  }

  async getExportSettings(): Promise<ExportSettings> {
    // Load from settings/exportSettings/completionRules
    // Default settings for now - will be loaded from Firestore in actual implementation
    return {
      completionRules: {
        minimumCompletionPct: 80,
        requiredSites: [],
        blockingAttributes: {
          'amazon': ['title', 'description', 'seo_title', 'seo_description'],
          'shopify': ['title', 'description', 'seo_title', 'seo_description'],
          'walmart': ['title', 'description', 'seo_title', 'seo_description']
        }
      }
    };
  }

  // Operator-visible explanation formatting
  formatBlockingExplanation(reasons: ExportBlockingReason[]): string {
    if (reasons.length === 0) {
      return 'Product is ready for export';
    }

    const explanations = reasons.map(reason => {
      switch (reason.type) {
        case 'COMPLETION_BELOW_THRESHOLD':
          return `• Completion: ${reason.currentCompletion}% (need ${reason.requiredCompletion}%)`;
        case 'SITE_MISSING_REQUIRED':
          return `• ${reason.site}: Missing ${reason.missingAttributes?.join(', ')}`;
        default:
          return `• ${reason.message}`;
      }
    });

    return `Export blocked:\n${explanations.join('\n')}`;
  }
}