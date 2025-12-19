/**
 * ExportAuditButton Component
 * PVS-0.3.3 - Audit UI
 * 
 * Button with dropdown for exporting audit log:
 * - CSV format
 * - JSON format
 * - Optional date range filter
 * - Optional actor filter
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ExportOptions } from '../hooks/useAudit';
import styles from './AuditTab.module.css';

export interface ExportAuditButtonProps {
  onExport: (options: ExportOptions) => Promise<string | null>;
  exporting: boolean;
  disabled?: boolean;
}

/**
 * ExportAuditButton component
 */
export function ExportAuditButton({
  onExport,
  exporting,
  disabled = false,
}: ExportAuditButtonProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [actor, setActor] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDropdown(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleExport = useCallback(async (format: 'csv' | 'json') => {
    const options: ExportOptions = { format };
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    if (actor.trim()) options.actor = actor.trim();

    await onExport(options);
    setShowDropdown(false);
  }, [onExport, startDate, endDate, actor]);

  const handleQuickExport = useCallback(async () => {
    await onExport({ format: 'csv' });
  }, [onExport]);

  const clearFilters = useCallback(() => {
    setStartDate('');
    setEndDate('');
    setActor('');
  }, []);

  const hasFilters = startDate || endDate || actor;

  return (
    <div className={styles.exportWrapper} ref={dropdownRef}>
      <div className={styles.exportButtons}>
        {/* Quick export button */}
        <button
          type="button"
          className={styles.exportBtn}
          onClick={handleQuickExport}
          disabled={disabled || exporting}
          title="Export audit log as CSV"
        >
          {exporting ? (
            <>
              <span className={styles.spinnerSmall} />
              Exporting...
            </>
          ) : (
            <>📥 Export CSV</>
          )}
        </button>

        {/* Dropdown toggle */}
        <button
          type="button"
          className={styles.exportDropdownToggle}
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={disabled || exporting}
          aria-expanded={showDropdown}
          aria-haspopup="menu"
          aria-label="Export options"
        >
          ▼
        </button>
      </div>

      {/* Dropdown menu */}
      {showDropdown && (
        <div className={styles.exportDropdown} role="menu">
          <div className={styles.exportDropdownHeader}>
            Export Audit Log
          </div>

          {/* Quick export options */}
          <div className={styles.exportQuickOptions}>
            <button
              type="button"
              className={styles.exportOption}
              onClick={() => handleExport('csv')}
              role="menuitem"
            >
              📄 Export as CSV
            </button>
            <button
              type="button"
              className={styles.exportOption}
              onClick={() => handleExport('json')}
              role="menuitem"
            >
              { } Export as JSON
            </button>
          </div>

          {/* Advanced options toggle */}
          <button
            type="button"
            className={styles.exportAdvancedToggle}
            onClick={() => setShowAdvanced(!showAdvanced)}
            aria-expanded={showAdvanced}
          >
            {showAdvanced ? '▼' : '▶'} Advanced Options
            {hasFilters && <span className={styles.exportFilterBadge}>Filters active</span>}
          </button>

          {/* Advanced filter options */}
          {showAdvanced && (
            <div className={styles.exportAdvanced}>
              <div className={styles.exportFilterGroup}>
                <label htmlFor="export-start-date" className={styles.exportFilterLabel}>
                  Start Date
                </label>
                <input
                  id="export-start-date"
                  type="date"
                  className={styles.exportFilterInput}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className={styles.exportFilterGroup}>
                <label htmlFor="export-end-date" className={styles.exportFilterLabel}>
                  End Date
                </label>
                <input
                  id="export-end-date"
                  type="date"
                  className={styles.exportFilterInput}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className={styles.exportFilterGroup}>
                <label htmlFor="export-actor" className={styles.exportFilterLabel}>
                  Actor (email)
                </label>
                <input
                  id="export-actor"
                  type="text"
                  className={styles.exportFilterInput}
                  value={actor}
                  onChange={(e) => setActor(e.target.value)}
                  placeholder="Filter by user email"
                />
              </div>

              {hasFilters && (
                <button
                  type="button"
                  className={styles.exportClearFilters}
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              )}

              <div className={styles.exportFilterActions}>
                <button
                  type="button"
                  className={styles.exportFilterBtn}
                  onClick={() => handleExport('csv')}
                >
                  Export CSV with Filters
                </button>
                <button
                  type="button"
                  className={styles.exportFilterBtn}
                  onClick={() => handleExport('json')}
                >
                  Export JSON with Filters
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ExportAuditButton;
