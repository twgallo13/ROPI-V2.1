import { useEffect } from 'react';

/**
 * Hook to set the document title dynamically
 * Format: "Page Name – ROPI AOSS"
 * 
 * @param pageTitle - The specific page title (e.g., "Products", "Export Settings")
 */
export function usePageTitle(pageTitle: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = pageTitle ? `${pageTitle} – ROPI AOSS` : 'ROPI AOSS';
    
    return () => {
      document.title = previousTitle;
    };
  }, [pageTitle]);
}
