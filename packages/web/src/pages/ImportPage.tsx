import PageLayout from '@/components/common/PageLayout';

/**
 * Import Manager Page
 * 
 * IMPORTANT: Notion Importer is officially retired (see Build Progress Log deprecation notice).
 * Do NOT implement, merge, run, or reference any Notion Importer work.
 * 
 * TODO: This page should handle other import sources (CSV, API, etc.) according to Section 1
 * https://www.notion.so/eba3cfdc44fd49ef98c38b183642cc7b
 * 
 * Expected features:
 * - File upload interface
 * - Import history
 * - Import templates
 * - Validation and preview
 * - Progress tracking
 */
function ImportPage() {
  return (
    <PageLayout title="Import Manager">
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        <h3>Import Manager placeholder</h3>
        <p>This will handle product data imports from various sources (CSV, API, etc.).</p>
        <p style={{ marginTop: '1rem', fontSize: 'var(--font-size-sm)', color: 'var(--color-warning)' }}>
          ⚠️ Note: Notion Importer is officially retired per Build Progress Log deprecation notice.
        </p>
        <p style={{ fontSize: 'var(--font-size-sm)' }}>
          📋 Implementation details in Notion: Section 1 — Navigation & Page Index
        </p>
      </div>
    </PageLayout>
  );
}

export default ImportPage;
