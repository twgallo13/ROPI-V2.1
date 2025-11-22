/**
 * Attributes API Handler
 * Manages canonical attribute registry with AI policies, import/export flags, and audit trail
 */
import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';

interface AttributeData {
  canonicalPath: string;
  label?: string;
  category?: string;
  dataType?: string;
  description?: string;
  importerColumns?: string[];
  [key: string]: unknown;
}

interface RequestWithUser extends Request {
  user?: {
    email?: string;
    role?: string;
  };
}

const ajv = new Ajv();
addFormats(ajv);

// Load attribute schema
let attributeSchema: Record<string, unknown> = {};
try {
  const schemaPath = path.resolve(__dirname, '../../src/schema/attribute.schema.json');
  attributeSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
} catch (error) {
  console.error('Failed to load attribute schema:', error);
}

const validateAttribute = ajv.compile(attributeSchema);

/**
 * GET /api/attributes
 * Returns canonical registry (paged/searchable)
 */
export async function getAttributes(req: Request, res: Response) {
  try {
    const { page = 1, limit = 50, category, search, foundation, exportable } = req.query;
    
    const db = admin.firestore();
    let query: admin.firestore.Query = db.collection('settings').doc('attributes').collection('keys');
    
    // Apply filters
    if (category) {
      query = query.where('category', '==', category);
    }
    if (foundation === 'true') {
      query = query.where('foundation', '==', true);
    }
    if (exportable === 'true') {
      query = query.where('export', '==', true);
    }
    
    // Execute query
    const snapshot = await query.get();
    let attributes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as unknown as AttributeData[];
    
    // Apply search filter if provided
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      attributes = attributes.filter(attr => 
        attr.label?.toLowerCase().includes(searchLower) ||
        attr.canonicalPath?.toLowerCase().includes(searchLower) ||
        attr.description?.toLowerCase().includes(searchLower)
      );
    }
    
    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    
    const paginatedAttributes = attributes.slice(startIndex, endIndex);
    
    res.status(200).json({
      attributes: paginatedAttributes,
      total: attributes.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(attributes.length / limitNum)
    });
  } catch (error) {
    console.error('Error fetching attributes:', error);
    res.status(500).json({ error: 'Failed to fetch attributes' });
  }
}

/**
 * POST /api/attributes
 * Create new attribute (metadata-only)
 */
export async function createAttribute(req: RequestWithUser, res: Response) {
  try {
    const attribute = req.body as AttributeData;
    const userEmail = req.user?.email || 'system';
    
    // Validate schema
    const valid = validateAttribute(attribute);
    if (!valid) {
      return res.status(400).json({ 
        error: 'Invalid attribute schema', 
        details: validateAttribute.errors 
      });
    }
    
    // Check if attribute already exists
    const db = admin.firestore();
    const existingDoc = await db.collection('settings')
      .doc('attributes')
      .collection('keys')
      .doc(attribute.canonicalPath)
      .get();
    
    if (existingDoc.exists) {
      return res.status(409).json({ error: 'Attribute already exists' });
    }
    
    // Add audit information
    const now = new Date().toISOString();
    const attributeWithAudit: AttributeData = {
      ...attribute,
      audit: {
        createdBy: userEmail,
        createdAt: now,
        updatedBy: userEmail,
        updatedAt: now,
        version: '1.0'
      }
    };
    
    // Save to Firestore
    await db.collection('settings')
      .doc('attributes')
      .collection('keys')
      .doc(attribute.canonicalPath)
      .set(attributeWithAudit, { merge: true });
    
    // Create audit entry
    await createAuditEntry(db, {
      action: 'create',
      canonicalPath: attribute.canonicalPath,
      user: userEmail,
      timestamp: now,
      changes: attributeWithAudit
    });
    
    res.status(201).json({ 
      success: true, 
      attribute: attributeWithAudit 
    });
  } catch (error) {
    console.error('Error creating attribute:', error);
    res.status(500).json({ error: 'Failed to create attribute' });
  }
}

/**
 * PUT /api/attributes/:canonicalPath
 * Update attribute (audit: updatedBy, updatedAt)
 */
export async function updateAttribute(req: RequestWithUser, res: Response) {
  try {
    const { canonicalPath } = req.params;
    const updates = req.body as Partial<AttributeData>;
    const userEmail = req.user?.email || 'system';
    
    const db = admin.firestore();
    const docRef = db.collection('settings')
      .doc('attributes')
      .collection('keys')
      .doc(canonicalPath);
    
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Attribute not found' });
    }
    
    const existingAttribute = doc.data() as AttributeData;
    
    // Merge updates with existing data
    const updatedAttribute: AttributeData & { audit: Record<string, unknown> } = {
      ...existingAttribute,
      ...updates,
      canonicalPath, // Ensure canonicalPath doesn't change
      audit: {
        ...(existingAttribute.audit as Record<string, unknown> || {}),
        updatedBy: userEmail,
        updatedAt: new Date().toISOString(),
        version: incrementVersion((existingAttribute.audit as Record<string, unknown>)?.version as string || '1.0')
      }
    };
    
    // Validate merged result
    const valid = validateAttribute(updatedAttribute);
    if (!valid) {
      return res.status(400).json({ 
        error: 'Invalid attribute schema', 
        details: validateAttribute.errors 
      });
    }
    
    // Save to Firestore
    await docRef.set(updatedAttribute as admin.firestore.DocumentData, { merge: true });
    
    // Create audit entry
    await createAuditEntry(db, {
      action: 'update',
      canonicalPath,
      user: userEmail,
      timestamp: updatedAttribute.audit.updatedAt as string,
      changes: updates,
      previous: existingAttribute
    });
    
    res.status(200).json({ 
      success: true, 
      attribute: updatedAttribute 
    });
  } catch (error) {
    console.error('Error updating attribute:', error);
    res.status(500).json({ error: 'Failed to update attribute' });
  }
}

/**
 * DELETE /api/attributes/:canonicalPath
 * Soft-delete or mark deprecated:true
 */
export async function deleteAttribute(req: RequestWithUser, res: Response) {
  try {
    const { canonicalPath } = req.params;
    const userEmail = req.user?.email || 'system';
    
    const db = admin.firestore();
    const docRef = db.collection('settings')
      .doc('attributes')
      .collection('keys')
      .doc(canonicalPath);
    
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Attribute not found' });
    }
    
    const existingAttribute = doc.data();
    const now = new Date().toISOString();
    
    // Soft delete by marking as deprecated
    await docRef.update({
      deprecated: true,
      'audit.updatedBy': userEmail,
      'audit.updatedAt': now
    });
    
    // Create audit entry
    await createAuditEntry(db, {
      action: 'delete',
      canonicalPath,
      user: userEmail,
      timestamp: now,
      previous: existingAttribute
    });
    
    res.status(200).json({ 
      success: true, 
      message: 'Attribute marked as deprecated' 
    });
  } catch (error) {
    console.error('Error deleting attribute:', error);
    res.status(500).json({ error: 'Failed to delete attribute' });
  }
}

/**
 * POST /api/attributes/seed
 * Seed local registry to staging Firestore
 */
export async function seedAttributes(req: RequestWithUser, res: Response) {
  try {
    const userEmail = req.user?.email || 'system';
    const { dryRun = false } = req.body;
    
    // Check authorization - only Editors/Admins
    const userRole = req.user?.role;
    if (!userRole || !['admin', 'editor'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Load registry from file
    const registryPath = path.resolve(__dirname, '../../../scripts/attribute-registry-normalized.json');
    let registry: Record<string, AttributeData>;
    
    try {
      registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
    } catch {
      return res.status(500).json({ 
        error: 'Failed to load registry file',
        path: registryPath
      });
    }
    
    if (dryRun) {
      return res.status(200).json({
        dryRun: true,
        count: Object.keys(registry).length,
        attributes: Object.keys(registry),
        message: 'Dry run successful'
      });
    }
    
    // Seed to Firestore
    const db = admin.firestore();
    const batch = db.batch();
    let count = 0;
    
    for (const [canonicalPath, attribute] of Object.entries(registry)) {
      const docRef = db.collection('settings')
        .doc('attributes')
        .collection('keys')
        .doc(canonicalPath);
      
      batch.set(docRef, attribute as admin.firestore.DocumentData, { merge: true });
      count++;
    }
    
    await batch.commit();
    
    // Create audit entry
    await createAuditEntry(db, {
      action: 'seed',
      canonicalPath: '*',
      user: userEmail,
      timestamp: new Date().toISOString(),
      changes: { count, source: 'attribute-registry-normalized.json' }
    });
    
    res.status(200).json({ 
      success: true, 
      count,
      message: `Seeded ${count} attributes to Firestore` 
    });
  } catch (error) {
    console.error('Error seeding attributes:', error);
    res.status(500).json({ error: 'Failed to seed attributes' });
  }
}

/**
 * POST /api/attributes/propose-mapping
 * Accepts CSV upload and returns proposed mapping
 * v3.0.3: Now supports multipart/form-data uploads
 */
export async function proposeMapping(req: Request, res: Response) {
  try {
    // v3.0.3: Accept JSON with csvData or csvPath
    const { csvPath, csvData } = req.body;
    
    if (!csvPath && !csvData) {
      return res.status(400).json({ 
        error: 'csvData required', 
        details: 'Send CSV content as string in request body {csvData: "..."}'
      });
    }
    
    const csvContent = csvPath ? fs.readFileSync(csvPath, 'utf-8') : csvData;
    
    // Parse CSV headers
    const lines = csvContent.split('\n').filter((line: string) => line.trim());
    if (lines.length === 0) {
      return res.status(400).json({ error: 'Empty CSV file' });
    }
    
    const headers = lines[0].split(',').map((h: string) => h.trim().replace(/^"|"$/g, ''));
    
    // Load registry
    const db = admin.firestore();
    const snapshot = await db.collection('settings')
      .doc('attributes')
      .collection('keys')
      .get();
    
    const registry = snapshot.docs.reduce((acc, doc) => {
      acc[doc.id] = doc.data() as AttributeData;
      return acc;
    }, {} as Record<string, AttributeData>);
    
    // Generate mapping proposals
    const mappings = headers.map((header: string) => {
      const proposal = findBestMatch(header, registry);
      return {
        csvHeader: header,
        canonicalPath: proposal.canonicalPath,
        confidence: proposal.confidence,
        matchType: proposal.matchType, // 'exact', 'synonym', 'fuzzy'
        matchedAlias: proposal.matchedAlias
      };
    });
    
    // Calculate summary
    const summary = mappings.reduce((acc: { exact: number; synonym: number; fuzzy: number; unmapped: number }, m: { matchType: string }) => {
      if (m.matchType === 'exact') acc.exact++;
      else if (m.matchType === 'synonym') acc.synonym++;
      else if (m.matchType === 'fuzzy') acc.fuzzy++;
      else acc.unmapped++;
      return acc;
    }, { exact: 0, synonym: 0, fuzzy: 0, unmapped: 0 });
    
    res.status(200).json({ 
      success: true,
      mappingsCount: mappings.length,
      mappings,
      headers,
      summary,
      registrySize: Object.keys(registry).length
    });
  } catch (error) {
    console.error('Error proposing mapping:', error);
    res.status(500).json({ 
      error: 'Failed to propose mapping',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * POST /api/attributes/suggest
 * AI-powered alias suggestions for a given attribute
 * v3.0.3: Read-only endpoint, does not mutate registry
 * TODO: Require auth for production (currently relaxed for staging)
 */
export async function suggestAliases(req: Request, res: Response) {
  try {
    const { header, csvSampleValues, currentAliases } = req.body;
    
    if (!header) {
      return res.status(400).json({ error: 'header required' });
    }
    
    // Load registry
    const db = admin.firestore();
    const snapshot = await db.collection('settings')
      .doc('attributes')
      .collection('keys')
      .get();
    
    const registry = snapshot.docs.reduce((acc, doc) => {
      acc[doc.id] = doc.data() as AttributeData;
      return acc;
    }, {} as Record<string, AttributeData>);
    
    // Find best matches using existing matching logic
    const proposal = findBestMatch(header, registry);
    
    // Generate suggestions based on similar attributes
    const suggestions: Array<{
      canonicalPath: string;
      confidence: number;
      reason: string;
      matchType: string;
    }> = [];
    
    // Primary suggestion from findBestMatch
    if (proposal.canonicalPath) {
      suggestions.push({
        canonicalPath: proposal.canonicalPath,
        confidence: proposal.confidence,
        reason: `${proposal.matchType} match via "${proposal.matchedAlias}"`,
        matchType: proposal.matchType
      });
    }
    
    // Find other potential matches
    for (const [path, attr] of Object.entries(registry)) {
      if (path === proposal.canonicalPath) continue;
      
      const aliases = attr.importerColumns || [];
      const label = attr.label?.toLowerCase() || '';
      const headerLower = header.toLowerCase();
      
      // Check for partial matches
      let matchScore = 0;
      let matchReason = '';
      
      if (aliases.some(alias => alias.toLowerCase() === headerLower)) {
        matchScore = 0.95;
        matchReason = 'exact alias match';
      } else if (label.includes(headerLower) || headerLower.includes(label)) {
        matchScore = 0.7;
        matchReason = 'partial label match';
      } else if (aliases.some(alias => {
        const aliasLower = alias.toLowerCase();
        return aliasLower.includes(headerLower) || headerLower.includes(aliasLower);
      })) {
        matchScore = 0.6;
        matchReason = 'partial alias match';
      }
      
      if (matchScore > 0 && suggestions.length < 5) {
        suggestions.push({
          canonicalPath: path,
          confidence: matchScore,
          reason: matchReason,
          matchType: matchScore >= 0.9 ? 'exact' : 'fuzzy'
        });
      }
    }
    
    // Sort by confidence
    suggestions.sort((a, b) => b.confidence - a.confidence);
    
    res.status(200).json({
      success: true,
      suggestions: suggestions.slice(0, 5), // Return top 5
      query: { header, csvSampleValues, currentAliases }
    });
  } catch (error) {
    console.error('Error suggesting aliases:', error);
    res.status(500).json({ 
      error: 'Failed to generate suggestions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Helper functions

function createAuditEntry(db: admin.firestore.Firestore, entry: Record<string, unknown>) {
  const timestamp = (entry.timestamp as string) || new Date().toISOString();
  const auditRef = db.collection('settings')
    .doc('attributes')
    .collection('audit')
    .doc(timestamp.replace(/[:.]/g, '-'));
  
  return auditRef.set(entry);
}

function incrementVersion(version: string): string {
  const parts = version.split('.');
  const minor = parseInt(parts[1] || '0');
  return `${parts[0]}.${minor + 1}`;
}

function findBestMatch(header: string, registry: Record<string, AttributeData>) {
  const headerLower = header.toLowerCase().trim();
  let bestMatch = {
    canonicalPath: '',
    confidence: 0,
    matchType: 'none' as 'exact' | 'synonym' | 'fuzzy' | 'none',
    matchedAlias: ''
  };
  
  for (const [canonicalPath, attribute] of Object.entries(registry)) {
    // Check exact match on label
    if (attribute.label?.toLowerCase() === headerLower) {
      return {
        canonicalPath,
        confidence: 1.0,
        matchType: 'exact' as const,
        matchedAlias: attribute.label
      };
    }
    
    // Check importerColumns (aliases)
    if (Array.isArray(attribute.importerColumns)) {
      for (const alias of attribute.importerColumns) {
        if (alias.toLowerCase() === headerLower) {
          return {
            canonicalPath,
            confidence: 0.95,
            matchType: 'synonym' as const,
            matchedAlias: alias
          };
        }
      }
    }
    
    // Fuzzy match on label
    const labelSimilarity = stringSimilarity(headerLower, attribute.label?.toLowerCase() || '');
    if (labelSimilarity > bestMatch.confidence && labelSimilarity > 0.7) {
      bestMatch = {
        canonicalPath,
        confidence: labelSimilarity,
        matchType: 'fuzzy' as const,
        matchedAlias: attribute.label || ''
      };
    }
  }
  
  return bestMatch;
}

function stringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

export default {
  getAttributes,
  createAttribute,
  updateAttribute,
  deleteAttribute,
  seedAttributes,
  proposeMapping,
  suggestAliases
};
