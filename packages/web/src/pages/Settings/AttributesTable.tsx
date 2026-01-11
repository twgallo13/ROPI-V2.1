/* AttributesTable - settings/attributes/table
 * Implements search, sort, pagination, AI Use quick toggle
 */
import { useMemo, useState, useCallback } from 'react';
import { useAttributes, type Attribute } from '../../hooks/useAttributes';
import { toastError, toastSuccess } from '../../lib/notifications';
import '../../pages/Settings/Settings.css';

const PAGE_SIZES = [25, 50, 75, 100];

function SortIndicator({ dir }: { dir: 'asc' | 'desc' | null }) {
  if (!dir) return null;
  return <span style={{ marginLeft: 6 }}>{dir === 'asc' ? '▲' : '▼'}</span>;
}

export default function AttributesTable() {
  const {
    attributes = [],
    loading,
    error,
    fetchAttributes,
    updateAttribute,
  } = useAttributes() as any;

  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState<string>('label');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [pageSize, setPageSize] = useState<number>(25);
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let items = attributes || [];
    if (term) {
      items = items.filter((a: Attribute) =>
        (a.label || '').toLowerCase().includes(term) ||
        (a.category || '').toLowerCase().includes(term)
      );
    }
    items = [...items].sort((a: any, b: any) => {
      const av = (a[sortKey as keyof Attribute] ?? '') as any;
      const bv = (b[sortKey as keyof Attribute] ?? '') as any;
      const na = typeof av === 'boolean' ? (av ? 1 : 0) : String(av || '').toLowerCase();
      const nb = typeof bv === 'boolean' ? (bv ? 1 : 0) : String(bv || '').toLowerCase();
      if (na < nb) return sortDir === 'asc' ? -1 : 1;
      if (na > nb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return items;
  }, [attributes, q, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil((filtered?.length || 0) / pageSize));
  const pageItems = filtered?.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize) || [];

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleToggleAiUse = useCallback(async (attr: Attribute) => {
    const id = attr.attribute_id;
    const newVal = !Boolean(attr.ai_use);
    setUpdatingId(id);
    try {
      const res = await updateAttribute(id, { ai_use: newVal });
      if (!res || !res.ok) {
        const err = (res && res.error) || 'Unknown error';
        toastError(`Failed to update AI Use: ${err}`);
      } else {
        toastSuccess(`AI Use ${newVal ? 'enabled' : 'disabled'} for ${attr.label || id}`);
      }
    } catch (err: any) {
      toastError(String(err.message || err || 'Update failed'));
    } finally {
      setUpdatingId(null);
    }
  }, [updateAttribute]);

  if (loading) {
    return (
      <div className="settings-page">
        <h1>Attribute Table</h1>
        <div className="loadingInline"><div className="spinner" /> Loading attributes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="settings-page">
        <h1>Attribute Table</h1>
        <div className="errorState">
          <p>Error loading attributes: {String(error)}</p>
          <button className="btnPrimary" onClick={() => fetchAttributes()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <h1>Attribute Table</h1>

      <div className="tableControls" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <input
          type="search"
          placeholder="Search Attribute Name or Category"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPageIndex(0); }}
          className="formInput"
          style={{ width: 320 }}
        />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <label>Rows:</label>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPageIndex(0); }}>
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <table className="settingsTable" aria-label="Attributes table">
        <thead>
          <tr>
            <th onClick={() => toggleSort('label')} style={{ cursor: 'pointer' }}>Attribute Name <SortIndicator dir={sortKey === 'label' ? sortDir : null} /></th>
            <th onClick={() => toggleSort('attribute_id')} style={{ cursor: 'pointer' }}>Attribute ID <SortIndicator dir={sortKey === 'attribute_id' ? sortDir : null} /></th>
            <th onClick={() => toggleSort('category')} style={{ cursor: 'pointer' }}>Category <SortIndicator dir={sortKey === 'category' ? sortDir : null} /></th>
            <th onClick={() => toggleSort('status')} style={{ cursor: 'pointer' }}>Status <SortIndicator dir={sortKey === 'status' ? sortDir : null} /></th>
            <th onClick={() => toggleSort('data_type')} style={{ cursor: 'pointer' }}>Type <SortIndicator dir={sortKey === 'data_type' ? sortDir : null} /></th>
            <th onClick={() => toggleSort('required_for_completion')} style={{ cursor: 'pointer' }}>Required for Completion <SortIndicator dir={sortKey === 'required_for_completion' ? sortDir : null}/></th>
            <th onClick={() => toggleSort('required_for_export')} style={{ cursor: 'pointer' }}>Required for Export <SortIndicator dir={sortKey === 'required_for_export' ? sortDir : null}/></th>
            <th onClick={() => toggleSort('import_required')} style={{ cursor: 'pointer' }}>Required for Import <SortIndicator dir={sortKey === 'import_required' ? sortDir : null}/></th>
            <th onClick={() => toggleSort('ai_use')} style={{ cursor: 'pointer' }}>AI Use <SortIndicator dir={sortKey === 'ai_use' ? sortDir : null}/></th>
          </tr>
        </thead>
        <tbody>
          {pageItems.length === 0 ? (
            <tr>
              <td colSpan={9}>
                <div style={{ padding: 24, textAlign: 'center' }}>No attributes match your query.</div>
              </td>
            </tr>
          ) : pageItems.map((attr: Attribute) => (
            <tr key={attr.attribute_id}>
              <td>{attr.label}</td>
              <td>{attr.attribute_id}</td>
              <td>{attr.category || '-'}</td>
              <td>{attr.status || '-'}</td>
              <td>{attr.data_type || '-'}</td>
              <td style={{ textAlign: 'center' }}>{attr.required_for_completion ? 'Yes' : 'No'}</td>
              <td style={{ textAlign: 'center' }}>{attr.required_for_export ? 'Yes' : 'No'}</td>
              <td style={{ textAlign: 'center' }}>{attr.import_required ? 'Yes' : 'No'}</td>
              <td style={{ textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={Boolean(attr.ai_use)}
                  disabled={updatingId === attr.attribute_id}
                  onChange={() => handleToggleAiUse(attr)}
                  aria-label={`AI Use for ${attr.label}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, alignItems: 'center' }}>
        <div>Page {pageIndex + 1} of {pageCount} — {filtered?.length ?? 0} total</div>
        <div>
          <button className="btnSecondary" disabled={pageIndex === 0} onClick={() => setPageIndex(p => Math.max(0, p - 1))}>Prev</button>
          <button className="btnPrimary" style={{ marginLeft: 8 }} disabled={pageIndex + 1 >= pageCount} onClick={() => setPageIndex(p => Math.min(pageCount - 1, p + 1))}>Next</button>
        </div>
      </div>
    </div>
  );
}