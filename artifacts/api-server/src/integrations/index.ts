import type { IntegrationAdapter } from "./types";
import { shopifyAdapter } from "./shopify";
import { metaAdsAdapter } from "./metaAds";
import { wooCommerceAdapter } from "./woocommerce";
import { googleAdsAdapter } from "./googleAds";
import { tikTokAdapter } from "./tiktok";
import { amazonAdapter } from "./amazon";
import { supplierAdapter } from "./supplier";
import { klaviyoAdapter } from "./klaviyo";
import { pinterestAdapter } from "./pinterest";
import { snapchatAdapter } from "./snapchat";
import { microsoftAdsAdapter } from "./microsoftAds";
import { ebayAdapter } from "./ebay";
import { stripeAdapter } from "./stripe";
import { paypalAdapter } from "./paypal";
import { shipstationAdapter } from "./shipstation";

export const SUPPORTED_PLATFORMS = [
  "shopify",
  "woocommerce",
  "amazon",
  "ebay",
  "meta_ads",
  "google_ads",
  "tiktok",
  "pinterest",
  "snapchat",
  "microsoft_ads",
  "klaviyo",
  "stripe",
  "paypal",
  "shipstation",
  "supplier",
] as const;

export type SupportedPlatform = (typeof SUPPORTED_PLATFORMS)[number];

const REGISTRY: Record<SupportedPlatform, IntegrationAdapter> = {
  shopify: shopifyAdapter,
  woocommerce: wooCommerceAdapter,
  amazon: amazonAdapter,
  ebay: ebayAdapter,
  meta_ads: metaAdsAdapter,
  google_ads: googleAdsAdapter,
  tiktok: tikTokAdapter,
  pinterest: pinterestAdapter,
  snapchat: snapchatAdapter,
  microsoft_ads: microsoftAdsAdapter,
  klaviyo: klaviyoAdapter,
  stripe: stripeAdapter,
  paypal: paypalAdapter,
  shipstation: shipstationAdapter,
  supplier: supplierAdapter,
};

export function getAdapter(platform: string): IntegrationAdapter | null {
  return REGISTRY[platform as SupportedPlatform] ?? null;
}

export const PLATFORM_LABELS: Record<string, string> = {
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  amazon: "Amazon",
  ebay: "eBay",
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  tiktok: "TikTok Ads",
  pinterest: "Pinterest Ads",
  snapchat: "Snapchat Ads",
  microsoft_ads: "Microsoft Ads",
  klaviyo: "Klaviyo",
  stripe: "Stripe",
  paypal: "PayPal",
  shipstation: "ShipStation",
  supplier: "Supplier (REST)",
};

export const PLATFORM_CATEGORIES: Record<string, string> = {
  shopify: "store",
  woocommerce: "store",
  amazon: "store",
  ebay: "store",
  meta_ads: "ads",
  google_ads: "ads",
  tiktok: "ads",
  pinterest: "ads",
  snapchat: "ads",
  microsoft_ads: "ads",
  klaviyo: "email",
  stripe: "payments",
  paypal: "payments",
  shipstation: "shipping",
  supplier: "supplier",
};

export type { IntegrationAdapter, SyncResult } from "./types";
