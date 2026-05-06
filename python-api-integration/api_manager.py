"""
api_manager.py
Central orchestrator — call these three functions from your application.

Usage:
    from api_manager import sync_marketing_data, sync_store_orders, sync_supplier_stock

    marketing = sync_marketing_data()
    orders    = sync_store_orders()
    stock     = sync_supplier_stock()
"""

from __future__ import annotations

import logging
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from dotenv import load_dotenv  # type: ignore

# Load .env if present (no-op if the file is absent)
load_dotenv()

# --------------------------------------------------------------------------- #
# Logging                                                                       #
# --------------------------------------------------------------------------- #
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------- #
# Feature flags — set to "false" to disable a platform without removing code   #
# --------------------------------------------------------------------------- #
def _enabled(key: str, default: bool = True) -> bool:
    return os.getenv(key, str(default)).lower() not in ("false", "0", "no")


ENABLE_FACEBOOK    = _enabled("ENABLE_FACEBOOK")
ENABLE_GOOGLE_ADS  = _enabled("ENABLE_GOOGLE_ADS")
ENABLE_TIKTOK      = _enabled("ENABLE_TIKTOK")
ENABLE_SHOPIFY     = _enabled("ENABLE_SHOPIFY")
ENABLE_WOOCOMMERCE = _enabled("ENABLE_WOOCOMMERCE")
ENABLE_AMAZON      = _enabled("ENABLE_AMAZON")
ENABLE_SUPPLIER    = _enabled("ENABLE_SUPPLIER")

# Date window (days) applied to all store and supplier adapters
DEFAULT_DAYS = int(os.getenv("SYNC_DAYS", "30"))


# --------------------------------------------------------------------------- #
# Lazy adapter initialisation                                                   #
# --------------------------------------------------------------------------- #
def _build_marketing_adapters() -> list:
    adapters = []
    if ENABLE_FACEBOOK:
        try:
            from adapters.facebook import FacebookAdapter
            adapters.append(FacebookAdapter())
        except Exception as exc:
            logger.warning("Facebook adapter skipped: %s", exc)

    if ENABLE_GOOGLE_ADS:
        try:
            from adapters.google_ads import GoogleAdsAdapter
            adapters.append(GoogleAdsAdapter())
        except Exception as exc:
            logger.warning("Google Ads adapter skipped: %s", exc)

    if ENABLE_TIKTOK:
        try:
            from adapters.tiktok import TikTokAdapter
            adapters.append(TikTokAdapter())
        except Exception as exc:
            logger.warning("TikTok adapter skipped: %s", exc)

    return adapters


def _build_store_adapters() -> list:
    adapters = []
    if ENABLE_SHOPIFY:
        try:
            from adapters.shopify import ShopifyAdapter
            adapters.append(ShopifyAdapter())
        except Exception as exc:
            logger.warning("Shopify adapter skipped: %s", exc)

    if ENABLE_WOOCOMMERCE:
        try:
            from adapters.woocommerce import WooCommerceAdapter
            adapters.append(WooCommerceAdapter())
        except Exception as exc:
            logger.warning("WooCommerce adapter skipped: %s", exc)

    if ENABLE_AMAZON:
        try:
            from adapters.amazon import AmazonAdapter
            adapters.append(AmazonAdapter())
        except Exception as exc:
            logger.warning("Amazon adapter skipped: %s", exc)

    return adapters


def _build_supplier_adapters() -> list:
    adapters = []
    if ENABLE_SUPPLIER:
        try:
            from adapters.supplier import SupplierAdapter
            adapters.append(SupplierAdapter())
        except Exception as exc:
            logger.warning("Supplier adapter skipped: %s", exc)
    return adapters


# --------------------------------------------------------------------------- #
# Public API                                                                    #
# --------------------------------------------------------------------------- #
def sync_marketing_data(days: int = DEFAULT_DAYS) -> dict[str, Any]:
    """
    Fetch campaign data from all enabled marketing platforms in parallel.

    Returns:
        {
            "campaigns": [
                {
                    "id": str,
                    "name": str,
                    "source": str,      # "facebook" | "google_ads" | "tiktok"
                    "spend": float,
                    "impressions": int,
                    "clicks": int,
                    "conversions": int,
                },
                ...
            ],
            "summary": {
                "total_spend": float,
                "total_impressions": int,
                "total_clicks": int,
                "total_conversions": int,
            },
            "errors": [ { "source": str, "error": str }, ... ]
        }
    """
    adapters = _build_marketing_adapters()
    all_campaigns: list[dict] = []
    errors: list[dict] = []

    def _fetch(adapter) -> dict:
        return adapter.sync_marketing_data()

    with ThreadPoolExecutor(max_workers=len(adapters) or 1) as pool:
        futures = {pool.submit(_fetch, a): a for a in adapters}
        for future in as_completed(futures):
            adapter = futures[future]
            source = adapter.__class__.__name__
            try:
                result = future.result()
                # Tag each campaign with its source
                for c in result.get("campaigns", []):
                    c.setdefault("source", result.get("source", source))
                all_campaigns.extend(result.get("campaigns", []))
                logger.info("%s: %d campaigns synced", source, len(result.get("campaigns", [])))
            except Exception as exc:
                logger.error("%s sync failed: %s", source, exc, exc_info=True)
                errors.append({"source": source, "error": str(exc)})

    summary = {
        "total_spend":       round(sum(c.get("spend", 0)       for c in all_campaigns), 2),
        "total_impressions": sum(c.get("impressions", 0) for c in all_campaigns),
        "total_clicks":      sum(c.get("clicks", 0)      for c in all_campaigns),
        "total_conversions": sum(c.get("conversions", 0) for c in all_campaigns),
    }
    return {"campaigns": all_campaigns, "summary": summary, "errors": errors}


def sync_store_orders(days: int = DEFAULT_DAYS) -> list[dict[str, Any]]:
    """
    Fetch orders from all enabled store platforms in parallel.

    Returns:
        [
            {
                "id": str,
                "date": str,           # ISO8601
                "total": float,
                "status": str,
                "fulfillment": str,
                "source": str,         # "shopify" | "woocommerce" | "amazon"
            },
            ...
        ]
        Sorted by date descending.
    """
    adapters = _build_store_adapters()
    all_orders: list[dict] = []
    errors: list[dict] = []

    def _fetch(adapter) -> list[dict]:
        return adapter.sync_store_orders(days=days)

    with ThreadPoolExecutor(max_workers=len(adapters) or 1) as pool:
        futures = {pool.submit(_fetch, a): a for a in adapters}
        for future in as_completed(futures):
            adapter = futures[future]
            source = adapter.__class__.__name__
            try:
                orders = future.result()
                all_orders.extend(orders)
                logger.info("%s: %d orders synced", source, len(orders))
            except Exception as exc:
                logger.error("%s sync failed: %s", source, exc, exc_info=True)
                errors.append({"source": source, "error": str(exc)})

    if errors:
        logger.warning("sync_store_orders finished with %d error(s)", len(errors))

    all_orders.sort(key=lambda o: o.get("date", ""), reverse=True)
    return all_orders


def sync_supplier_stock(path: str | None = None, params: dict | None = None) -> list[dict[str, Any]]:
    """
    Fetch stock levels from all enabled supplier adapters.

    Returns:
        [
            {
                "sku": str,
                "name": str,
                "stock": int,
                "price": float,
                "source": "supplier",
            },
            ...
        ]
    """
    adapters = _build_supplier_adapters()
    all_stock: list[dict] = []
    errors: list[dict] = []

    kwargs: dict[str, Any] = {}
    if path:
        kwargs["path"] = path
    if params:
        kwargs["params"] = params

    with ThreadPoolExecutor(max_workers=len(adapters) or 1) as pool:
        futures = {pool.submit(a.sync_supplier_stock, **kwargs): a for a in adapters}
        for future in as_completed(futures):
            adapter = futures[future]
            source = adapter.__class__.__name__
            try:
                stock = future.result()
                all_stock.extend(stock)
                logger.info("%s: %d stock lines synced", source, len(stock))
            except Exception as exc:
                logger.error("%s sync failed: %s", source, exc, exc_info=True)
                errors.append({"source": source, "error": str(exc)})

    if errors:
        logger.warning("sync_supplier_stock finished with %d error(s)", len(errors))

    return all_stock


# --------------------------------------------------------------------------- #
# Quick CLI smoke test                                                           #
# --------------------------------------------------------------------------- #
if __name__ == "__main__":
    import json

    print("\n=== Marketing ===")
    marketing = sync_marketing_data()
    print(json.dumps(marketing["summary"], indent=2))
    print(f"Campaigns: {len(marketing['campaigns'])}")

    print("\n=== Orders ===")
    orders = sync_store_orders()
    print(f"Total orders: {len(orders)}")
    if orders:
        print(json.dumps(orders[0], indent=2))

    print("\n=== Supplier Stock ===")
    stock = sync_supplier_stock()
    print(f"Total SKUs: {len(stock)}")
    if stock:
        print(json.dumps(stock[0], indent=2))
