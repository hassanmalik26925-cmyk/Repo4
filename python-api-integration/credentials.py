"""
credentials.py
Load all API credentials from environment variables.
Copy .env.example → .env and fill in your values.
"""

import os
from dataclasses import dataclass, field


def _require(key: str) -> str:
    """Return env var or raise a clear error at startup."""
    val = os.getenv(key)
    if not val:
        raise EnvironmentError(
            f"Required environment variable '{key}' is not set. "
            "Check your .env file or environment."
        )
    return val


def _optional(key: str, default: str = "") -> str:
    return os.getenv(key, default)


@dataclass(frozen=True)
class FacebookCreds:
    access_token: str = field(default_factory=lambda: _require("FB_ACCESS_TOKEN"))
    account_id: str = field(default_factory=lambda: _require("FB_AD_ACCOUNT_ID"))
    api_version: str = field(default_factory=lambda: _optional("FB_API_VERSION", "v20.0"))


@dataclass(frozen=True)
class GoogleAdsCreds:
    developer_token: str = field(default_factory=lambda: _require("GOOGLE_ADS_DEVELOPER_TOKEN"))
    client_id: str = field(default_factory=lambda: _require("GOOGLE_ADS_CLIENT_ID"))
    client_secret: str = field(default_factory=lambda: _require("GOOGLE_ADS_CLIENT_SECRET"))
    refresh_token: str = field(default_factory=lambda: _require("GOOGLE_ADS_REFRESH_TOKEN"))
    customer_id: str = field(default_factory=lambda: _require("GOOGLE_ADS_CUSTOMER_ID"))
    login_customer_id: str = field(default_factory=lambda: _optional("GOOGLE_ADS_LOGIN_CUSTOMER_ID"))


@dataclass(frozen=True)
class TikTokCreds:
    access_token: str = field(default_factory=lambda: _require("TIKTOK_ACCESS_TOKEN"))
    advertiser_id: str = field(default_factory=lambda: _require("TIKTOK_ADVERTISER_ID"))
    app_id: str = field(default_factory=lambda: _optional("TIKTOK_APP_ID"))
    secret: str = field(default_factory=lambda: _optional("TIKTOK_SECRET"))


@dataclass(frozen=True)
class ShopifyCreds:
    shop_domain: str = field(default_factory=lambda: _require("SHOPIFY_SHOP_DOMAIN"))
    access_token: str = field(default_factory=lambda: _require("SHOPIFY_ACCESS_TOKEN"))
    api_version: str = field(default_factory=lambda: _optional("SHOPIFY_API_VERSION", "2024-07"))


@dataclass(frozen=True)
class WooCommerceCreds:
    store_url: str = field(default_factory=lambda: _require("WOO_STORE_URL"))
    consumer_key: str = field(default_factory=lambda: _require("WOO_CONSUMER_KEY"))
    consumer_secret: str = field(default_factory=lambda: _require("WOO_CONSUMER_SECRET"))


@dataclass(frozen=True)
class AmazonCreds:
    refresh_token: str = field(default_factory=lambda: _require("AMAZON_REFRESH_TOKEN"))
    client_id: str = field(default_factory=lambda: _require("AMAZON_CLIENT_ID"))
    client_secret: str = field(default_factory=lambda: _require("AMAZON_CLIENT_SECRET"))
    marketplace_id: str = field(default_factory=lambda: _require("AMAZON_MARKETPLACE_ID"))
    seller_id: str = field(default_factory=lambda: _require("AMAZON_SELLER_ID"))
    region: str = field(default_factory=lambda: _optional("AMAZON_REGION", "us-east-1"))


@dataclass(frozen=True)
class SupplierCreds:
    base_url: str = field(default_factory=lambda: _require("SUPPLIER_BASE_URL"))
    api_key: str = field(default_factory=lambda: _require("SUPPLIER_API_KEY"))
    # Optional header name; some suppliers use X-Api-Key, others Authorization, etc.
    api_key_header: str = field(default_factory=lambda: _optional("SUPPLIER_API_KEY_HEADER", "X-Api-Key"))
