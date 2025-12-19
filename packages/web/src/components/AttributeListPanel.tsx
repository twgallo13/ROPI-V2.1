/**
 * AttributeListPanel Component
 * Left panel with searchable, filterable attribute list
 * 
 * Lisa PVS-0.2.3
 */

import React, { useState, useCallback, useMemo, memo, useRef, useEffect } from 'react';
import type { Attribute } from '../hooks/useAttributes';
import styles from '../pages/Settings/AttributesConsole.module.css';

export type FilterStatus = 'all' | 'active' | 'deprecated' | 'hidden';

export interface AttributeListPanelProps {
  attributes: Attribute[];
  selectedId: string | null;
  loading?: boolean;
  onSelect: (attribute: Attribute) => void;
  onCreateNew: () => void;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Memoized list item component
const ListItem = memo(function ListItem({
  attribute,
  isSelected,
  onSelect,
}: {
  attribute: Attribute;
  isSelected: boolean;
  onSelect: (attr: Attribute) => void;
}) {
  const statusClass = attribute.status === 'active' || !attribute.status
    ? styles.statusActive
    : attribute.status === 'deprecated'
    ? styles.statusDeprecated
    : styles.statusHidden;

  return (
    <div
      className={`${styles.listItem} ${isSelected ? styles.listItemSelected : ''}`}
      onClick={() => onSelect(attribute)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(attribute);
        }
      }}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      data-testid={`list-item-${attribute.attribute_id}`}
      data-attribute-id={attribute.attribute_id}
    >
      <div className={styles.listItemContent}>
        <p className={styles.listItemLabel}>{attribute.label || attribute.attribute_id}</p>
        <p className={styles.listItemId}>{attribute.attribute_id}</p>
      </div>
      <div className={styles.listItemMeta}>
        <span className={`${styles.statusDot} ${statusClass}`} title={attribute.status || 'active'} />
        <span className={styles.typeBadge}>{attribute.data_type || 'string'}</span>
      </div>
    </div>
  );
});

// Simple virtualization for large lists
function VirtualizedList({
  items,
  selectedId,
  onSelect,
  itemHeight = 60,
}: {
  items: Attribute[];
  selectedId: string | null;
  onSelect: (attr: Attribute) => void;
  itemHeight?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => setContainerHeight(container.clientHeight);
    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + 2
  );

  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <div
      ref={containerRef}
      className={styles.listContent}
      onScroll={handleScroll}
      role="listbox"
      aria-label="Attributes list"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', top: startIndex * itemHeight, width: '100%' }}>
          {visibleItems.map((attr) => (
            <ListItem
              key={attr.attribute_id}
              attribute={attr}
              isSelected={selectedId === attr.attribute_id}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AttributeListPanel({
  attributes,
  selectedId,
  loading = false,
  onSelect,
  onCreateNew,
}: AttributeListPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Debounce search input (250ms)
  const debouncedSearch = useDebounce(searchQuery, 250);

  // Filter and search logic
  const filteredAttributes = useMemo(() => {
    let result = attributes;

    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter((attr) => {
        const status = attr.status || 'active';
        return status === filterStatus;
      });
    }

    // Search by label or id
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(
        (attr) =>
          attr.label?.toLowerCase().includes(query) ||
          attr.attribute_id.toLowerCase().includes(query)
      );
    }

    return result;
  }, [attributes, filterStatus, debouncedSearch]);

  const handleFilterClick = useCallback((status: FilterStatus) => {
    setFilterStatus((prev) => (prev === status ? 'all' : status));
  }, []);

  // Use virtualization for large lists (> 200 items)
  const useVirtualization = filteredAttributes.length > 200;

  return (
    <div className={styles.listPanel} data-testid="attribute-list-panel">
      {/* Header with search */}
      <div className={styles.listHeader}>
        <h2 className={styles.listTitle}>Attributes</h2>
        <div className={styles.searchContainer}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search attributes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search attributes"
            data-testid="search-input"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className={styles.filterChips}>
        <button
          type="button"
          className={`${styles.filterChip} ${filterStatus === 'active' ? styles.filterChipActive : ''}`}
          onClick={() => handleFilterClick('active')}
          aria-pressed={filterStatus === 'active'}
          data-testid="filter-active"
        >
          Active
        </button>
        <button
          type="button"
          className={`${styles.filterChip} ${filterStatus === 'deprecated' ? styles.filterChipActive : ''}`}
          onClick={() => handleFilterClick('deprecated')}
          aria-pressed={filterStatus === 'deprecated'}
          data-testid="filter-deprecated"
        >
          Deprecated
        </button>
        <button
          type="button"
          className={`${styles.filterChip} ${filterStatus === 'hidden' ? styles.filterChipActive : ''}`}
          onClick={() => handleFilterClick('hidden')}
          aria-pressed={filterStatus === 'hidden'}
          data-testid="filter-hidden"
        >
          Hidden
        </button>
      </div>

      {/* List content */}
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          Loading attributes...
        </div>
      ) : filteredAttributes.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>📋</div>
          <p>{searchQuery || filterStatus !== 'all' ? 'No matching attributes found.' : 'No attributes yet.'}</p>
        </div>
      ) : useVirtualization ? (
        <VirtualizedList
          items={filteredAttributes}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ) : (
        <div className={styles.listContent} role="listbox" aria-label="Attributes list">
          {filteredAttributes.map((attr) => (
            <ListItem
              key={attr.attribute_id}
              attribute={attr}
              isSelected={selectedId === attr.attribute_id}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}

      {/* Footer with create button */}
      <div className={styles.listFooter}>
        <button
          type="button"
          className={styles.newAttributeBtn}
          onClick={onCreateNew}
          aria-label="Create new attribute"
          data-testid="new-attribute-btn"
        >
          <span>+</span> New Attribute
        </button>
      </div>
    </div>
  );
}
