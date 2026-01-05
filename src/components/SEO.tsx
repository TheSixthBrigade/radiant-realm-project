import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  // Product-specific
  price?: number;
  currency?: string;
  availability?: 'in stock' | 'out of stock';
  category?: string;
  rating?: number;
  reviewCount?: number;
  // Organization
  noIndex?: boolean;
}

const SITE_NAME = 'Vectabase';
const SITE_URL = 'https://vectabase.com';
const DEFAULT_IMAGE = `${SITE_URL}/banner.png`;
const DEFAULT_DESCRIPTION = 'Discover premium digital assets, scripts, and 3D models. The all-in-one marketplace for game creators to buy and sell quality digital content. Sellers keep 95%.';

export const SEO = ({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = 'digital assets, game scripts, 3D models, Roblox scripts, game development, marketplace, digital marketplace, game assets, UI kits, textures, audio assets',
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  author,
  publishedTime,
  modifiedTime,
  price,
  currency = 'USD',
  availability = 'in stock',
  category,
  rating,
  reviewCount,
  noIndex = false,
}: SEOProps) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Digital Assets Marketplace`;
  const fullUrl = url ? `${SITE_URL}${url}` : SITE_URL;
  const fullImage = image.startsWith('http') ? image : `${SITE_URL}${image}`;

  useEffect(() => {
    // Update document title
    document.title = fullTitle;

    // Helper to update or create meta tag
    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attr}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Basic meta tags
    setMeta('description', description);
    setMeta('keywords', keywords);
    if (author) setMeta('author', author);
    
    // Robots
    setMeta('robots', noIndex ? 'noindex, nofollow' : 'index, follow');
    
    // Open Graph
    setMeta('og:title', fullTitle, true);
    setMeta('og:description', description, true);
    setMeta('og:image', fullImage, true);
    setMeta('og:url', fullUrl, true);
    setMeta('og:type', type, true);
    setMeta('og:site_name', SITE_NAME, true);
    setMeta('og:locale', 'en_US', true);
    
    // Twitter Card
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', description);
    setMeta('twitter:image', fullImage);
    setMeta('twitter:site', '@vectabase');
    
    // Article specific
    if (type === 'article') {
      if (publishedTime) setMeta('article:published_time', publishedTime, true);
      if (modifiedTime) setMeta('article:modified_time', modifiedTime, true);
      if (author) setMeta('article:author', author, true);
    }
    
    // Product specific
    if (type === 'product' && price !== undefined) {
      setMeta('product:price:amount', price.toString(), true);
      setMeta('product:price:currency', currency, true);
      setMeta('product:availability', availability, true);
      if (category) setMeta('product:category', category, true);
    }

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', fullUrl);

    // Cleanup function
    return () => {
      // Reset to defaults when component unmounts
      document.title = `${SITE_NAME} - Digital Assets Marketplace`;
    };
  }, [fullTitle, description, keywords, fullImage, fullUrl, type, author, publishedTime, modifiedTime, price, currency, availability, category, noIndex]);

  return null;
};

// JSON-LD Structured Data Components
export const OrganizationSchema = () => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Vectabase',
    url: SITE_URL,
    logo: `${SITE_URL}/Logo_pic.png`,
    description: DEFAULT_DESCRIPTION,
    sameAs: [
      'https://twitter.com/vectabase',
      'https://discord.gg/vectabase',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      url: `${SITE_URL}/contact`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

export const WebsiteSchema = () => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Vectabase',
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/shop?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

interface ProductSchemaProps {
  name: string;
  description: string;
  image: string;
  price: number;
  currency?: string;
  availability?: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
  seller?: string;
  url: string;
}

export const ProductSchema = ({
  name,
  description,
  image,
  price,
  currency = 'USD',
  availability = 'InStock',
  category,
  rating,
  reviewCount,
  seller,
  url,
}: ProductSchemaProps) => {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: image.startsWith('http') ? image : `${SITE_URL}${image}`,
    url: `${SITE_URL}${url}`,
    category: category || 'Digital Asset',
    offers: {
      '@type': 'Offer',
      price: price.toFixed(2),
      priceCurrency: currency,
      availability: `https://schema.org/${availability}`,
      seller: seller ? {
        '@type': 'Person',
        name: seller,
      } : {
        '@type': 'Organization',
        name: 'Vectabase',
      },
    },
  };

  if (rating && reviewCount) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating.toFixed(1),
      reviewCount: reviewCount,
      bestRating: '5',
      worstRating: '1',
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

interface BreadcrumbSchemaProps {
  items: Array<{ name: string; url: string }>;
}

export const BreadcrumbSchema = ({ items }: BreadcrumbSchemaProps) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

interface FAQSchemaProps {
  questions: Array<{ question: string; answer: string }>;
}

export const FAQSchema = ({ questions }: FAQSchemaProps) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

export default SEO;
