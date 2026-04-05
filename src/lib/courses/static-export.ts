const STATIC_EXPORT_PLACEHOLDER = "__static-export-placeholder__";

/**
 * Next.js export currently treats an empty param list for dynamic app routes
 * like a missing generateStaticParams() implementation. We emit one
 * placeholder path so builds still succeed when the course catalog is empty.
 */
export function ensureCourseStaticParams(params: { slug: string }[]) {
  return params.length > 0 ? params : [{ slug: STATIC_EXPORT_PLACEHOLDER }];
}

export function ensureCourseContentStaticParams(params: { slug: string; contentKey: string }[]) {
  return params.length > 0 ? params : [{ slug: STATIC_EXPORT_PLACEHOLDER, contentKey: STATIC_EXPORT_PLACEHOLDER }];
}

export function isStaticExportPlaceholderSlug(slug: string) {
  return slug === STATIC_EXPORT_PLACEHOLDER;
}

export function isStaticExportPlaceholderContent(slug: string, contentKey: string) {
  return isStaticExportPlaceholderSlug(slug) && contentKey === STATIC_EXPORT_PLACEHOLDER;
}
