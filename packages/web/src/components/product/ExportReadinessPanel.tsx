import type { ExportReadiness } from '../../types/product';
import './ExportReadinessPanel.css';

/**
 * Export Readiness Panel
 * 
 * Display export readiness score and per-website checklist
 * 
 * TODO: Implement comprehensive export validation rules
 * References:
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 */

interface ExportReadinessPanelProps {
  readiness: ExportReadiness;
  websites: string[];
  onJumpToTab?: (tab: string) => void;
}

function ExportReadinessPanel({ readiness, websites, onJumpToTab }: ExportReadinessPanelProps) {
  // LP-3.0.7: Defensive guards for readiness data
  const safeReadiness = readiness ?? { overall: 0, byWebsite: {} };
  const safeWebsites = Array.isArray(websites) ? websites : [];
  const overallScore = typeof safeReadiness.overall === 'number' ? safeReadiness.overall : 0;

  // Aggregate missing attributes (labels) across all websites, fallback to empty
  const missingAcrossSites = safeWebsites
    .map((site) => safeReadiness.byWebsite?.[site]?.missingAttributes ?? [])
    .flat()
    .filter(Boolean);

  // De-duplicate by attribute id while preserving first label encountered
  const uniqueMissing = Array.from(
    new Map(missingAcrossSites.map((attr) => [attr.id, attr])).values()
  );

  const getScoreClass = (score: number): string => {
    if (score >= 80) return 'score-ready';
    if (score >= 50) return 'score-progress';
    return 'score-incomplete';
  };

  const checklistLabels = {
    coreInfo: 'Core Information',
    attributes: 'Product Attributes',
    descriptions: 'Descriptions',
    media: 'Media Assets',
    pricing: 'Pricing Data',
  };

  const checklistTabs = {
    coreInfo: 'core',
    attributes: 'attributes',
    descriptions: 'descriptions',
    media: 'launch',
    pricing: 'core',
  };

  return (
    <div className="product-panel">
      <div className="product-panel-header">
        <h4 className="product-panel-title">Export Readiness</h4>
        <span className={`product-panel-badge ${getScoreClass(overallScore)}`}>
          {overallScore}%
        </span>
      </div>
      
      <div className="product-panel-content">
        <div className="readiness-bar">
          <div 
            className={`readiness-bar-fill ${getScoreClass(overallScore)}`}
            style={{ width: `${overallScore}%` }}
          ></div>
        </div>

        <div className="readiness-overall-status">
          {overallScore >= 80 ? (
            <p className="status-ready">✓ Ready for export</p>
          ) : (
            <p className="status-incomplete">
              {100 - overallScore}% more to reach export-ready
            </p>
          )}
        </div>

        {uniqueMissing.length > 0 && (
          <div className="readiness-missing-attributes">
            <p>
              <strong>Missing Required Attributes:</strong>{' '}
              {uniqueMissing.map((attr) => attr.label).join(', ')}
            </p>
          </div>
        )}

        {safeWebsites.map(website => {
          const siteReadiness = safeReadiness.byWebsite?.[website];
          if (!siteReadiness) return null;

          return (
            <div key={website} className="readiness-website">
              <div className="readiness-website-header">
                <span className="readiness-website-name">{website}</span>
                <span className={`readiness-website-score ${getScoreClass(siteReadiness.score)}`}>
                  {siteReadiness.score}%
                </span>
              </div>
              
              <div className="readiness-checklist">
                {Object.entries(siteReadiness.checklist).map(([key, complete]) => (
                  <div
                    key={key}
                    className={`readiness-item ${complete ? 'readiness-complete' : 'readiness-incomplete'}`}
                    onClick={() => onJumpToTab?.(checklistTabs[key as keyof typeof checklistTabs])}
                    title={complete ? 'Complete' : 'Incomplete - click to edit'}
                  >
                    <span className="readiness-icon">{complete ? '✓' : '○'}</span>
                    <span className="readiness-label">
                      {checklistLabels[key as keyof typeof checklistLabels]}
                    </span>
                  </div>
                ))}
              </div>

              {Array.isArray(siteReadiness.missingAttributes) && siteReadiness.missingAttributes.length > 0 && (
                <div className="readiness-missing-attributes">
                  <strong>Missing for {website}:</strong>{' '}
                  {siteReadiness.missingAttributes.map((attr) => attr.label).join(', ')}
                </div>
              )}
            </div>
          );
        })}

        <div className="readiness-note">
          <p>
            <strong>Note:</strong> Export readiness is calculated based on required fields 
            for each website. Click incomplete items to jump to the relevant tab.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ExportReadinessPanel;
