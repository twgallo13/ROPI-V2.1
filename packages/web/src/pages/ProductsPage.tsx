import PageLayout from '@/components/common/PageLayout';

/**
 * Products List Page
 * 
 * TODO: Implement products list and filtering according to Section 1
 * https://www.notion.so/eba3cfdc44fd49ef98c38b183642cc7b
 * 
 * Expected features:
 * - Product grid/list view with thumbnails
 * - Search and filter controls
 * - Sort options
 * - Bulk action toolbar
 * - Status indicators
 * - Link to Product Editor for each product
 */
function ProductsPage() {
  return (
    <PageLayout title="Products">
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        <h3>Products list placeholder</h3>
        <p>This will display a searchable, filterable list of all products with status indicators.</p>
        <p style={{ marginTop: '1rem', fontSize: 'var(--font-size-sm)' }}>
          📋 Implementation details in Notion: Section 1 — Navigation & Page Index
        </p>
      </div>
    </PageLayout>
  );
}

export default ProductsPage;
