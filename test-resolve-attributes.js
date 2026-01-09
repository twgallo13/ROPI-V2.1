const registry = require('./packages/sdk/config/attributeRegistry.json');

// Convert registry to the format the function expects
const attrMap = {};
registry.attributes.forEach(attr => {
  attrMap[attr.attribute_id] = {
    attribute_id: attr.attribute_id,
    category: attr.category,
    required_for_completion: attr.required_for_completion,
    internalOnly: attr.internalOnly || false
  };
});

function normalizeRequirementFlag(flag) {
  if (!flag) return null;
  switch (flag) {
    case 'required_for_completion':
    case 'requiredForCompletion':
    case 'completionRequired':
      return 'required_for_completion';
    case 'required_for_export':
    case 'requiredForExport':
      return 'required_for_export';
    default:
      return null;
  }
}

function getNormalizedRequirementFlagValue(attr, canonicalFlag) {
  if (canonicalFlag === 'required_for_completion') {
    return Boolean(
      attr.required_for_completion ??
      attr.requiredForCompletion ??
      attr.completionRequired
    );
  }
  return Boolean(
    attr.required_for_export ??
    attr.requiredForExport
  );
}

function resolveAttributes(registry, selector) {
  const attributeIds = [];
  const canonicalRequirementFlag = normalizeRequirementFlag(selector.requirementFlag);
  
  console.log('Resolving with:');
  console.log('  categories:', selector.categories);
  console.log('  requirementFlag:', selector.requirementFlag, '-> canonical:', canonicalRequirementFlag);

  for (const [attrId, attr] of Object.entries(registry)) {
    // Skip if in exclusion list
    if (selector.excludeAttributeIds?.includes(attrId)) {
      continue;
    }

    // Skip internal-only attributes unless explicitly included
    if (attr.internalOnly && !selector.includeInternalOnly) {
      continue;
    }

    // Check category match
    if (attr.category && !selector.categories.includes(attr.category)) {
      continue;
    }

    // Check requirement flag
    if (canonicalRequirementFlag && !getNormalizedRequirementFlagValue(attr, canonicalRequirementFlag)) {
      continue;
    }

    attributeIds.push(attrId);
  }

  return attributeIds;
}

// Test with core-attributes selector
const selector = {
  categories: ['sku_core', 'classification'],
  requirementFlag: 'required_for_completion',
  excludeAttributeIds: [],
  includeInternalOnly: true
};

const result = resolveAttributes(attrMap, selector);
console.log('\nResolved attributes:', result);
console.log('Total:', result.length);
