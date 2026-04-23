import { Helmet } from "react-helmet-async";

import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_NAME } from "../../seo/site";

interface SeoProps {
  title: string;
  description: string;
  path?: string;
  canonical?: string;
  image?: string;
  keywords?: string[];
  noindex?: boolean;
  type?: "website" | "article";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export function Seo({
  title,
  description,
  path = "/",
  canonical,
  image,
  keywords,
  noindex = false,
  type = "website",
  jsonLd
}: SeoProps) {
  const canonicalUrl = canonical ?? absoluteUrl(path);
  const ogImage = image ?? DEFAULT_OG_IMAGE;
  const robots = noindex
    ? "noindex, nofollow, noarchive"
    : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
  const jsonLdEntries = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonicalUrl} />
      {keywords?.length ? <meta name="keywords" content={keywords.join(", ")} /> : null}

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="fr_FR" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLdEntries.map((entry, index) => (
        <script key={`seo-ld-${index}`} type="application/ld+json">
          {JSON.stringify(entry)}
        </script>
      ))}
    </Helmet>
  );
}
