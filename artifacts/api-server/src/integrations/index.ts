import type { IntegrationAdapter } from "./types";
import { shopifyAdapter } from "./shopify";
import { metaAdsAdapter } from "./metaAds";
import { wooCommerceAdapter } from "./woocommerce";
import { googleAdsAdapter } from "./googleAds";
import { tikTokAdapter } from "./tiktok";
import { amazonAdapter } from "./amazon";
import { supplierAdapter } from "./supplier";

export const SUPPORTED_PLATFORMS = [
  "shopify",
  "woocommerce",
  "amazon",
  "meta_ads",
  "google_ads",
  "tiktok",
  "supplier",
] as const;

export type SupportedPlatform = (typeof SUPPORTED_PLATFORMS)[number];

const REGISTRY: Record<SupportedPlatform, IntegrationAdapter> = {
  shopify: shopifyAdapter,
  woocommerce: wooCommerceAdapter,
  amazon: amazonAdapter,
  meta_ads: metaAdsAdapter,
  google_ads: googleAdsAdapter,
  tiktok: tikTokAdapter,
  supplier: supplierAdapter,
};

export function getAdapter(platform: string): IntegrationAdapter | null {
  return REGISTRY[platform as SupportedPlatform] ?? null;
}

export const PLATFORM_LABELS: Record<string, string> = {
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  amazon: "Amazon",
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  tiktok: "TikTok Ads",
  supplier: "Supplier (REST)",
};

export type { IntegrationAdapter, SyncResult } from "./types";
