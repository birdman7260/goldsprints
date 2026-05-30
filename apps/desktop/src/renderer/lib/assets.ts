import { apiBase } from "./api";

const absoluteAssetPattern = /^(?:[a-z][a-z\d+\-.]*:)?\/\//i;

export function resolveBackendAssetUrlFromBase(
  url: string | null | undefined,
  backendBaseUrl: string
): string | null {
  if (!url) {
    return null;
  }

  if (absoluteAssetPattern.test(url) || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  // Uploaded avatars are served by the backend, which is a different origin
  // than Vite during dev. Resolve relative upload paths through the API base.
  const baseUrl = backendBaseUrl.endsWith("/") ? backendBaseUrl : `${backendBaseUrl}/`;
  return new URL(url, baseUrl).toString();
}

export function resolveBackendAssetUrl(url: string | null | undefined): string | null {
  return resolveBackendAssetUrlFromBase(url, apiBase);
}
