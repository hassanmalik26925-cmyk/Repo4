import type { IntegrationAdapter } from "./types";
import { shopifyAdapter } from "./shopify";
import { metaAdsAdapter } from "./metaAds";

export const SUPPORTED_PLATFORMS = [
  "shopify",
  "woocommerce",
  "meta_ads",
  "google_ads",
  "custom",
] as const;

export type SupportedPlatform = (typeof SUPPORTED_PLATFORMS)[number];

const REGISTRY: Partial<Record<SupportedPlatform, IntegrationAdapter>> = {
  shopify: shopifyAdapter,
  meta_ads: metaAdsAdapter,
};

export function getAdapter(platform: string): IntegrationAdapter | null {
  return REGISTRY[platform as SupportedPlatform] ?? null;
}

export const PLATFORM_LABELS: Record<string, string> = {
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  custom: "Custom Supplier",
};

export type { IntegrationAdapter, SyncResult } from "./types";
