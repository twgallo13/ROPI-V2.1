/**
 * Smart Rules Settings Page
 * LP-smart-rules-admin-1.0.0: Admin Settings Smart Rules Manager
 * 
 * Full admin console for Smart Rules CRUD:
 * - List all rules with filters
 * - Create/Edit rules via IFTTT Builder
 * - Enable/disable rules
 * - Rule packs management
 * - Test console
 * - Audit history
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/common/PageLayout';
import { RuleBuilder } from '@/components/smartRules/RuleBuilder';
import { RuleTestConsole } from '@/components/smartRules/RuleTestConsole';
import { 
  listSmartRules, 
  getSmartRule, 
  createSmartRule, 
  updateSmartRule, 
  deleteSmartRule,
  listRulePacks,
  toggleRulePack,
  getRecentAuditActivity,
  documentToForm,
} from '@/services/smartRulesAdmin';
import type { 
  SmartRuleDocument, 
  SmartRuleForm, 
  RulePack,
  RuleAuditEntry,
} from '@/types/smartRulesAdmin';

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--spacing-lg)',
  },
  title: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 600,
  },
  headerButtons: {
    display: 'flex',
    gap: 'var(--spacing-sm)',
  },
  button: {
    padding: 'var(--spacing-sm) var(--spacing-md)',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
  },
  buttonSecondary: {
    backgroundColor: 'var(--color-background)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
  },
  buttonDanger: {
    backgroundColor: '#c62828',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid var(--color-border)',
    marginBottom: 'var(--spacing-lg)',
    gap: 'var(--spacing-md)',
  },
  tab: {
    padding: 'var(--spacing-sm) var(--spacing-md)',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: 'var(--font-size-base)',
    color: 'var(--color-text-secondary)',
    borderBottom: '2px solid transparent',
    marginBottom: '-1px',
  },
  tabActive: {
    color: 'var(--color-primary)',
    borderBottomColor: 'var(--color-primary)',
    fontWeight: 500,
  },
  filters: {
    display: 'flex',
    gap: 'var(--spacing-md)',
    marginBottom: 'var(--spacing-md)',
    flexWrap: 'wrap' as const,
  },
  filterInput: {
    padding: 'var(--spacing-sm) var(--spacing-md)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    fontSize: 'var(--font-size-sm)',
    minWidth: '200px',
  },
  filterSelect: {
    padding: 'var(--spacing-sm) var(--spacing-md)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    backgroundColor: 'var(--color-background)',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid var(--color-border)',
  },
  th: {
    padding: 'var(--spacing-md)',
    textAlign: 'left' as const,
    backgroundColor: 'var(--color-background-secondary)',
    fontWeight: 600,
    fontSize: 'var(--font-size-sm)',
    borderBottom: '1px solid var(--color-border)',
  },
  td: {
    padding: 'var(--spacing-md)',
    borderBottom: '1px solid var(--color-border)',
    fontSize: 'var(--font-size-sm)',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 500,
  },
  badgeEnabled: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  badgeDisabled: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
  badgeAuto: {
    backgroundColor: '#e3f2fd',
    color: '#1565c0',
  },
  tag: {
    display: 'inline-block',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: 'var(--font-size-xs)',
    backgroundColor: 'var(--color-background-secondary)',
    marginRight: '4px',
  },
  actions: {
    display: 'flex',
    gap: 'var(--spacing-xs)',
  },
  actionButton: {
    padding: '4px 8px',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    backgroundColor: 'var(--color-background)',
    cursor: 'pointer',
    fontSize: 'var(--font-size-xs)',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: 'var(--spacing-xl)',
    color: 'var(--color-text-secondary)',
  },
  modal: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'var(--color-background)',
    borderRadius: '8px',
    maxWidth: '900px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
    padding: 'var(--spacing-lg)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--spacing-lg)',
  },
  modalTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 600,
  },
  closeButton: {
    border: 'none',
    background: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    opacity: 0.6,
  },
  packCard: {
    padding: 'var(--spacing-md)',
    backgroundColor: 'var(--color-background-secondary)',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    marginBottom: 'var(--spacing-sm)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityItem: {
    padding: 'var(--spacing-sm)',
    borderBottom: '1px solid var(--color-border)',
    fontSize: 'var(--font-size-sm)',
  },
  activityTime: {
    color: 'var(--color-text-secondary)',
    fontSize: 'var(--font-size-xs)',
  },
};

// ============================================================================
// Types
// ============================================================================

type TabType = 'rules' | 'packs' | 'test' | 'activity';

// ============================================================================
// Component
// ============================================================================

function SmartRulesSettingsPage() {
  const navigate = useNavigate();
  
  // State
  const [activeTab, setActiveTab] = useState<TabType>('rules');
  const [rules, setRules] = useState<SmartRuleDocument[]>([]);
  const [packs, setPacks] = useState<RulePack[]>([]);
  const [activity, setActivity] = useState<RuleAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [tagFilter, setTagFilter] = useState('');
  
  // Modal state
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState<SmartRuleForm | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  // Load data
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [rulesResult, packsResult, activityResult] = await Promise.all([
        listSmartRules(),
        listRulePacks(),
        getRecentAuditActivity(20),
      ]);
      
      setRules(rulesResult.rules);
      setPacks(packsResult);
      setActivity(activityResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Filter rules
  const filteredRules = rules.filter(rule => {
    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !rule.name.toLowerCase().includes(query) &&
        !rule.description?.toLowerCase().includes(query) &&
        !rule.ruleId.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    
    // Status filter
    if (statusFilter === 'enabled' && !rule.enabled) return false;
    if (statusFilter === 'disabled' && rule.enabled) return false;
    
    // Tag filter
    if (tagFilter && !rule.tags?.includes(tagFilter)) return false;
    
    return true;
  });
  
  // Get unique tags for filter dropdown
  const allTags = Array.from(new Set(rules.flatMap(r => r.tags || [])));
  
  // Handle create rule
  const handleCreateRule = useCallback(() => {
    setEditingRule(null);
    setShowBuilder(true);
  }, []);
  
  // Handle edit rule
  const handleEditRule = useCallback(async (ruleId: string) => {
    const ruleDoc = await getSmartRule(ruleId);
    if (ruleDoc) {
      setEditingRule(documentToForm(ruleDoc));
      setShowBuilder(true);
    }
  }, []);
  
  // Handle save rule
  const handleSaveRule = useCallback(async (rule: SmartRuleForm) => {
    try {
      if (editingRule?.ruleId) {
        await updateSmartRule(editingRule.ruleId, rule);
      } else {
        await createSmartRule(rule);
      }
      
      setShowBuilder(false);
      setEditingRule(null);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save rule');
    }
  }, [editingRule, loadData]);
  
  // Handle toggle rule
  const handleToggleRule = useCallback(async (ruleId: string, enabled: boolean) => {
    try {
      await updateSmartRule(ruleId, { enabled });
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to toggle rule');
    }
  }, [loadData]);
  
  // Handle delete rule
  const handleDeleteRule = useCallback(async (ruleId: string) => {
    try {
      await deleteSmartRule(ruleId);
      setShowDeleteConfirm(null);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete rule');
    }
  }, [loadData]);
  
  // Handle toggle pack
  const handleTogglePack = useCallback(async (packId: string, enabled: boolean) => {
    try {
      await toggleRulePack(packId, enabled);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to toggle pack');
    }
  }, [loadData]);
  
  return (
    <PageLayout title="Smart Rules Settings">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <button
              onClick={() => navigate('/settings')}
              style={{ ...styles.button, ...styles.buttonSecondary, marginBottom: 'var(--spacing-sm)' }}
            >
              ← Back to Settings
            </button>
            <h1 style={styles.title}>⚡ Smart Rules Manager</h1>
          </div>
          <div style={styles.headerButtons}>
            <button
              style={{ ...styles.button, ...styles.buttonSecondary }}
              onClick={loadData}
            >
              🔄 Refresh
            </button>
            <button style={styles.button} onClick={handleCreateRule}>
              ➕ Create Rule
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(activeTab === 'rules' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('rules')}
          >
            📋 Rules ({rules.length})
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'packs' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('packs')}
          >
            📦 Rule Packs ({packs.length})
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'test' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('test')}
          >
            🧪 Test Console
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'activity' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('activity')}
          >
            📜 Activity
          </button>
        </div>
        
        {/* Error */}
        {error && (
          <div style={{ padding: 'var(--spacing-md)', backgroundColor: '#ffebee', borderRadius: '4px', marginBottom: 'var(--spacing-md)', color: '#c62828' }}>
            ❌ {error}
          </div>
        )}
        
        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <>
            {/* Filters */}
            <div style={styles.filters}>
              <input
                type="text"
                style={styles.filterInput}
                placeholder="Search rules..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <select
                style={styles.filterSelect}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as 'all' | 'enabled' | 'disabled')}
              >
                <option value="all">All Status</option>
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
              <select
                style={styles.filterSelect}
                value={tagFilter}
                onChange={e => setTagFilter(e.target.value)}
              >
                <option value="">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
            
            {/* Rules Table */}
            {loading ? (
              <div style={styles.emptyState}>Loading...</div>
            ) : filteredRules.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>⚡</div>
                <div>No rules found</div>
                <button style={{ ...styles.button, marginTop: 'var(--spacing-md)' }} onClick={handleCreateRule}>
                  Create Your First Rule
                </button>
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Condition</th>
                    <th style={styles.th}>Action</th>
                    <th style={styles.th}>Priority</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Tags</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRules.map(rule => (
                    <tr key={rule.ruleId}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 500 }}>{rule.name}</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                          {rule.ruleId}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <code style={{ fontSize: 'var(--font-size-xs)' }}>
                          {Array.isArray(rule.condition) 
                            ? `${rule.condition.length} conditions`
                            : `${rule.condition.field} ${rule.condition.matchType} ${rule.condition.value || ''}`
                          }
                        </code>
                      </td>
                      <td style={styles.td}>
                        <code style={{ fontSize: 'var(--font-size-xs)' }}>
                          {rule.action.targetField} = {rule.action.valueTemplate}
                        </code>
                      </td>
                      <td style={styles.td}>{rule.priority}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, ...(rule.enabled ? styles.badgeEnabled : styles.badgeDisabled) }}>
                          {rule.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                        {rule.autoApply && (
                          <span style={{ ...styles.badge, ...styles.badgeAuto, marginLeft: '4px' }}>
                            Auto
                          </span>
                        )}
                      </td>
                      <td style={styles.td}>
                        {rule.tags?.map(tag => (
                          <span key={tag} style={styles.tag}>{tag}</span>
                        ))}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          <button
                            style={styles.actionButton}
                            onClick={() => handleEditRule(rule.ruleId)}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            style={styles.actionButton}
                            onClick={() => handleToggleRule(rule.ruleId, !rule.enabled)}
                            title={rule.enabled ? 'Disable' : 'Enable'}
                          >
                            {rule.enabled ? '⏸️' : '▶️'}
                          </button>
                          <button
                            style={styles.actionButton}
                            onClick={() => setShowDeleteConfirm(rule.ruleId)}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
        
        {/* Packs Tab */}
        {activeTab === 'packs' && (
          <div>
            <div style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>
              Rule Packs let you group related rules and enable/disable them together.
            </div>
            
            {packs.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>📦</div>
                <div>No rule packs yet</div>
              </div>
            ) : (
              packs.map(pack => (
                <div key={pack.packId} style={styles.packCard}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{pack.name}</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                      {pack.ruleIds.length} rule(s) • {pack.description || 'No description'}
                    </div>
                  </div>
                  <div style={styles.actions}>
                    <span style={{ ...styles.badge, ...(pack.enabled ? styles.badgeEnabled : styles.badgeDisabled) }}>
                      {pack.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <button
                      style={styles.actionButton}
                      onClick={() => handleTogglePack(pack.packId, !pack.enabled)}
                    >
                      {pack.enabled ? '⏸️ Disable' : '▶️ Enable'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        
        {/* Test Tab */}
        {activeTab === 'test' && <RuleTestConsole />}
        
        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div>
            <div style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>
              Recent rule changes and audit trail.
            </div>
            
            {activity.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>📜</div>
                <div>No activity yet</div>
              </div>
            ) : (
              <div style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                {activity.map(entry => (
                  <div key={entry.auditId} style={styles.activityItem}>
                    <div>
                      <strong>{entry.action.toUpperCase()}</strong> rule "{entry.ruleId}"
                      {entry.actorEmail && ` by ${entry.actorEmail}`}
                    </div>
                    <div style={styles.activityTime}>
                      {new Date(entry.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Rule Builder Modal */}
        {showBuilder && (
          <div style={styles.modal} onClick={() => setShowBuilder(false)}>
            <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  {editingRule ? 'Edit Rule' : 'Create New Rule'}
                </h2>
                <button style={styles.closeButton} onClick={() => setShowBuilder(false)}>
                  ×
                </button>
              </div>
              <RuleBuilder
                initialValue={editingRule || undefined}
                onSave={handleSaveRule}
                onCancel={() => setShowBuilder(false)}
                isEditing={!!editingRule}
              />
            </div>
          </div>
        )}
        
        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div style={styles.modal} onClick={() => setShowDeleteConfirm(null)}>
            <div style={{ ...styles.modalContent, maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Delete Rule?</h3>
              <p style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--color-text-secondary)' }}>
                Are you sure you want to delete this rule? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm)' }}>
                <button
                  style={{ ...styles.button, ...styles.buttonSecondary }}
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  Cancel
                </button>
                <button
                  style={{ ...styles.button, ...styles.buttonDanger }}
                  onClick={() => handleDeleteRule(showDeleteConfirm)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

export default SmartRulesSettingsPage;
