"""
adapters/woocommerce.py
WooCommerce REST API v3 adapter (OAuth1 via consumer key/secret).
Docs: https://woocommerce.github.io/woocommerce-rest-api-docs/
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Any

import requests
from requests_oauthlib import OAuth1  # type: ignore

from .base import BaseAdapter, _retryable
from credentials import WooCommerceCreds

logger = logging.getLogger(__name__)

_PAGE_SIZE = 100


def _since_iso(days: int) -> str:
    return (date.today() - timedelta(days=days)).isoformat() + "T00:00:00"


class WooCommerceAdapter(BaseAdapter):
    """Fetch orders from WooCommerce REST API v3."""

    _rate_limit_calls = 5
    _rate_limit_period = 1.0

    def __init__(self, creds: WooCommerceCreds | None = None) -> None:
        super().__init__()
        self._creds = creds or WooCommerceCreds()
        base = self._creds.store_url.rstrip("/")
        self._base = f"{base}/wp-json/wc/v3"
        # WooCommerce uses OAuth1 for basic auth
        self._oauth = OAuth1(
            self._creds.consumer_key,
            self._creds.consumer_secret,
        )

    def _auth_headers(self) -> dict[str, str]:
        # Auth is injected via OAuth1 on the session, not headers
        return {}

    def _get(self, url: str, **kwargs: Any) -> dict | list:
        """Override to inject OAuth1 auth."""
        self._throttle()
        logger.debug("GET %s", url)
        resp = self._session.get(
            url, auth=self._oauth, timeout=30, **kwargs
        )
        resp.raise_for_status()
        return resp.json()

    # ---------------------------------------------------------------------- #
    # Public interface                                                          #
    # ---------------------------------------------------------------------- #
    @_retryable
    def get_orders(self, days: int = 30) -> list[dict[str, Any]]:
        """
        Fetch all orders created in the last N days (page-looped).

        Returns:
            List of raw WooCommerce order dicts.
        """
        after = _since_iso(days)
        url = f"{self._base}/orders"
        params: dict[str, Any] = {
            "after": after,
            "per_page": _PAGE_SIZE,
            "page": 1,
            "_fields": "id,date_created,total,status,line_items,customer_id",
        }
        orders: list[dict] = []
        while True:
            batch = self._get(url, params=params)
            if not batch:
                break
            orders.extend(batch)
            if len(batch) < _PAGE_SIZE:
                break
            params["page"] += 1

        logger.info("WooCommerce: fetched %d orders", len(orders))
        return orders

    def sync_store_orders(self, days: int = 30) -> list[dict[str, Any]]:
        """
        Normalised output for the orchestrator.

        Returns:
            [
                {
                    "id": str,
                    "date": str,
                    "total": float,
                    "status": str,
                    "fulfillment": str,
                    "source": "woocommerce",
                },
                ...
            ]
        """
        raw = self.get_orders(days=days)
        return [
            {
                "id": str(o["id"]),
                "date": o.get("date_created", ""),
                "total": float(o.get("total", 0)),
                "status": o.get("status", ""),
                "fulfillment": o.get("status", ""),  # WC status carries fulfillment
                "source": "woocommerce",
            }
            for o in raw
        ]
