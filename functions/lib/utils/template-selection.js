"use strict";
/**
 * AI Template Selection Logic (P14.1)
 * Condition-based template matching with fallback to default
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadAllTemplates = loadAllTemplates;
exports.selectTemplate = selectTemplate;
const admin = __importStar(require("firebase-admin"));
/**
 * Load all active templates from Firestore
 */
async function loadAllTemplates() {
    try {
        const db = admin.firestore();
        const templatesSnapshot = await db
            .collection('settings')
            .doc('ai')
            .collection('prompts')
            .get();
        const templates = [];
        templatesSnapshot.forEach(doc => {
            const data = doc.data();
            // Only include active or templates without status (backwards compat)
            if (!data.status || data.status === 'active') {
                templates.push({ ...data, key: doc.id });
            }
        });
        console.log(`[template-selection] Loaded ${templates.length} active templates`);
        return templates;
    }
    catch (error) {
        console.error('[template-selection] Failed to load templates:', error);
        return [];
    }
}
/**
 * Evaluate a single condition against product data
 */
function evaluateCondition(condition, product) {
    const { field, operator, value } = condition;
    const productValue = product[field];
    switch (operator) {
        case '==':
            return String(productValue).toLowerCase() === String(value).toLowerCase();
        case 'is-any-of':
            if (!Array.isArray(value))
                return false;
            const productValueLower = String(productValue || '').toLowerCase();
            return value.some(v => String(v).toLowerCase() === productValueLower);
        case 'includes':
            if (field === 'materials' && Array.isArray(product.materials)) {
                const searchTerm = String(value).toLowerCase();
                return product.materials.some(m => m.toLowerCase().includes(searchTerm));
            }
            return String(productValue || '').toLowerCase().includes(String(value).toLowerCase());
        case 'within-last-n-days':
            if (field !== 'launchDate' || !product.launchDate)
                return false;
            try {
                const launch = new Date(product.launchDate);
                const now = new Date();
                const daysDiff = Math.floor((now.getTime() - launch.getTime()) / (1000 * 60 * 60 * 24));
                const daysThreshold = typeof value === 'number' ? value : parseInt(String(value));
                return daysDiff >= 0 && daysDiff <= daysThreshold;
            }
            catch (e) {
                console.warn(`[template-selection] Failed to parse launch date: ${product.launchDate}`);
                return false;
            }
        default:
            return false;
    }
}
/**
 * Check if a template matches the product based on its conditions
 */
function matchesTemplate(template, product) {
    const conditions = template.conditions || [];
    // If no conditions, this is a fallback template (e.g., default)
    if (conditions.length === 0) {
        return { matches: true, conditionsMatched: [] };
    }
    const matchMode = template.matchMode || 'ALL';
    const conditionsMatched = [];
    for (const condition of conditions) {
        const matches = evaluateCondition(condition, product);
        if (matches) {
            const matchDesc = `${condition.field}${condition.operator}${Array.isArray(condition.value) ? condition.value.join('|') : condition.value}`;
            conditionsMatched.push(matchDesc);
        }
    }
    // Check match mode
    if (matchMode === 'ALL') {
        return {
            matches: conditionsMatched.length === conditions.length,
            conditionsMatched
        };
    }
    else {
        // ANY mode
        return {
            matches: conditionsMatched.length > 0,
            conditionsMatched
        };
    }
}
/**
 * Select the best matching template for a product
 * Priority: First matching template with conditions, then default template
 */
async function selectTemplate(product) {
    const templates = await loadAllTemplates();
    if (templates.length === 0) {
        throw new Error('No active templates found in Firestore');
    }
    // First, try to find templates with conditions that match
    const templatesWithConditions = templates.filter(t => (t.conditions || []).length > 0);
    for (const template of templatesWithConditions) {
        const { matches, conditionsMatched } = matchesTemplate(template, product);
        if (matches) {
            console.log(`[template-selection] Matched template: ${template.key} (${conditionsMatched.join(', ')})`);
            return {
                template,
                conditionsMatched
            };
        }
    }
    // Fallback to default template (no conditions)
    const defaultTemplate = templates.find(t => t.key === 'default' || (t.conditions || []).length === 0);
    if (defaultTemplate) {
        console.log('[template-selection] No conditions matched, using default template');
        return {
            template: defaultTemplate,
            fallbackReason: 'No matching conditions, using default'
        };
    }
    // Last resort: use first template
    console.warn('[template-selection] No default template found, using first available');
    return {
        template: templates[0],
        fallbackReason: 'No default template found'
    };
}
