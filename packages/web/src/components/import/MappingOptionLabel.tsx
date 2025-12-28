/**
 * MappingOptionLabel Component
 * LP-importer-mapping-recon-1.2.0: Presentational component for mapping option display
 * 
 * Shows attribute_id, label, and indicators for:
 * - reference_only usage
 * - taxonomy (has allowed_values)
 */

type Props = {
  attributeId: string;
  label: string;
  usage?: string;
  allowedValues?: any[];
  tooltip?: string;
};

/**
 * MappingOptionLabel
 * Renders a mapping option with attribute details and indicators.
 * LP-1.3.1: Removed inline font sizes, use CSS classes for consistent styling
 */
export default function MappingOptionLabel({ 
  attributeId, 
  label, 
  usage, 
  allowedValues,
  tooltip 
}: Props) {
  const isReferenceOnly = usage === 'reference_only';
  const hasTaxonomy = allowedValues && allowedValues.length > 0;

  return (
    <div 
      className="mapping-option-label"
      title={tooltip}
    >
      <div className="mapping-option-label__main">
        <strong>{attributeId}</strong>
        {label !== attributeId && (
          <span> — {label}</span>
        )}
        {isReferenceOnly && (
          <em 
            className="mapping-option-label__badge mapping-option-label__badge--reference"
            data-testid="reference-only-badge"
          >
            (reference only)
          </em>
        )}
        {hasTaxonomy && (
          <span 
            className="mapping-option-label__badge mapping-option-label__badge--taxonomy"
            data-testid="taxonomy-badge"
          >
            — taxonomy
          </span>
        )}
      </div>
      {isReferenceOnly && (
        <div 
          className="mapping-option-label__note"
          data-testid="reference-only-note"
        >
          Reference-only field. Not exported.
        </div>
      )}
    </div>
  );
}

// Tooltip content for common fields (LP-1.2.0 exact strings)
// LP-1.3.1: Unified tooltip keys to use canonical attribute_id format
export const FIELD_TOOLTIPS: Record<string, string> = {
  'primary_color': 'Primary Color — Standardized taxonomy used for filters/faceting and external feeds. Choose this for standardized colors.',
  'descriptive_color': 'Descriptive Color — Brand-defined, expressive colorway text for display. Not used for faceting.',
  'rics_long_desc': 'Reference-only: RICS data is for internal reference/AI enrichment only and is not exported.',
  'rics_short_description': 'Reference-only: RICS data is for internal reference/AI enrichment only and is not exported.',
  'rics_category': 'Reference-only: RICS data is for internal reference/AI enrichment only and is not exported.',
  'rics_color': 'Reference-only: RICS data is for internal reference/AI enrichment only and is not exported.',
};
