const chromeStoreUrl = process.env.NEXT_PUBLIC_CHROME_WEB_STORE_URL?.trim() || "";

export function getChromeWebStoreUrl() {
  return chromeStoreUrl;
}

export function getChromeWebStoreUrlWithUtm(source = "landing") {
  if (!chromeStoreUrl) {
    return "";
  }

  try {
    const url = new URL(chromeStoreUrl);
    url.searchParams.set("utm_source", source);
    url.searchParams.set("utm_medium", "cta");
    url.searchParams.set("utm_campaign", "chrome_launch");
    return url.toString();
  } catch {
    return "";
  }
}
