import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getSEOConfig, type SEOConfig } from '@/config/seoConfig';

interface UseSEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  robots?: string;
  customConfig?: Partial<SEOConfig>;
}

export function useSEO(props?: UseSEOProps) {
  const location = useLocation();
  
  // Get SEO config for current route
  const routeConfig = getSEOConfig(location.pathname);
  
  // Merge route config with custom props
  const config: SEOConfig = {
    title: props?.title || props?.customConfig?.title || routeConfig?.title || 'Dismissal Pro',
    description: props?.description || props?.customConfig?.description || routeConfig?.description || 'Efficient school dismissal management system',
    keywords: props?.keywords || props?.customConfig?.keywords || routeConfig?.keywords || 'school dismissal, student management, dismissal pro',
    robots: props?.robots || props?.customConfig?.robots || routeConfig?.robots || 'index, follow'
  };

  // Format title with brand prefix
  const fullTitle = config.title === 'Dismissal Pro' ? config.title : `Dismissal Pro | ${config.title}`;
  
  // Determine if current page is a content page (not dashboard/admin)
  const isContentPage = ['/', '/how-it-works', '/auth'].includes(location.pathname);
  
  // Return the SEO component
  const SEOComponent = () => (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={config.description} />
      <meta name="keywords" content={config.keywords} />
      <meta name="robots" content={config.robots} />
      <link rel="canonical" href={`${window.location.origin}${location.pathname}`} />
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={config.description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={`${window.location.origin}${location.pathname}`} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={config.description} />
      
      {/* HubSpot - Only on content pages */}
      {isContentPage && (
        <script type="text/javascript" id="hs-script-loader" async defer src="//js-na2.hs-scripts.com/244162050.js"></script>
      )}
    </Helmet>
  );

  return SEOComponent;
}