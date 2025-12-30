/**
 * Legacy to Registry Attribute ID Mapping
 * LP-importer-mapping-recon-1.1.0
 *
 * Temporary translation map: legacy normalized keys => canonical Attribute Registry IDs.
 * Update if registry attribute IDs change. This file is consulted by importNormalizer
 * to preserve backwards compatibility while we migrate consumers to registry IDs.
 *
 * Source of truth: evidence/importer-mapping-recon/attribute-registry.json (v1.1.4)
 */
export declare const LEGACY_TO_REGISTRY: Record<string, string>;
/**
 * Reverse mapping: Registry ID => primary legacy key
 * Used for consumers expecting legacy keys
 */
export declare const REGISTRY_TO_LEGACY: Record<string, string>;
//# sourceMappingURL=legacyToRegistryMap.d.ts.map