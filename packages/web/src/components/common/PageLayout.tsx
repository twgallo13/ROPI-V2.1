import './PageLayout.css';

interface PageLayoutProps {
  title: string;
  children: React.ReactNode;
}

/**
 * Reusable page layout component
 * Provides consistent header and content structure
 */
function PageLayout({ title, children }: PageLayoutProps) {
  return (
    <div className="page-layout">
      <header className="page-header">
        <h1 className="page-title">{title}</h1>
      </header>
      <div className="page-content">
        {children}
      </div>
    </div>
  );
}

export default PageLayout;
