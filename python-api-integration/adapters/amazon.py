"""
adapters/amazon.py
Amazon SP-API adapter using the python-amazon-sp-api library.
Docs: https://developer-docs.amazon.com/sp-api/docs
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any

from .base import BaseAdapter, _retryable
from credentials import AmazonCreds

logger = logging.getLogger(__name__)


def _iso_utc(days_ago: int) -> str:
    dt = datetime.now(tz=timezone.utc) - timedelta(days=days_ago)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


class AmazonAdapter(BaseAdapter):
    """
    Fetch orders from Amazon SP-API.

    Uses python-amazon-sp-api (pip install python-amazon-sp-api).
    """

    _rate_limit_calls = 1   # Orders endpoint: 0.0167 req/s (1 per 60s burst)
    _rate_limit_period = 2.0

    def __init__(self, creds: AmazonCreds | None = None) -> None:
        super().__init__()
        self._creds = creds or AmazonCreds()
        self._orders_api = self._build_orders_api()

    def _auth_headers(self) -> dict[str, str]:
        # python-amazon-sp-api handles all auth internally
        return {}

    def _build_orders_api(self):
        try:
            from sp_api.api import Orders  # type: ignore
            from sp_api.base import Marketplaces  # type: ignore
        except ImportError as exc:
            raise ImportError(
                "python-amazon-sp-api not installed. "
                "Run: pip install python-amazon-sp-api"
            ) from exc

        credentials = {
            "refresh_token": self._creds.refresh_token,
            "lwa_app_id": self._creds.client_id,
            "lwa_client_secret": self._creds.client_secret,
        }
        # Attempt to resolve marketplace; fall back to US if unknown
        try:
            marketplace = getattr(Marketplaces, self._creds.region.upper())
        except AttributeError:
            marketplace = Marketplaces.US

        return Orders(credentials=credentials, marketplace=marketplace)

    # ---------------------------------------------------------------------- #
    # Public interface                                                          #
    # ---------------------------------------------------------------------- #
    @_retryable
    def get_orders(self, days: int = 30) -> list[dict[str, Any]]:
        """
        Fetch orders created in the last N days (auto-paginated).

        Returns:
            List of raw Amazon order dicts.
        """
        created_after = _iso_utc(days)
        orders: list[dict] = []
        next_token: str | None = None

        while True:
            if next_token:
                resp = self._orders_api.get_orders(NextToken=next_token)
            else:
                resp = self._orders_api.get_orders(
                    MarketplaceIds=[self._creds.marketplace_id],
                    CreatedAfter=created_after,
                    OrderStatuses=["Shipped", "Pending", "Unshipped", "Canceled"],
                )
            payload = resp.payload
            orders.extend(payload.get("Orders", []))
            next_token = payload.get("NextToken")
            if not next_token:
                break
            # SP-API has a burst quota; sleep to stay within rate limits
            time.sleep(1)

        logger.info("Amazon: fetched %d orders", len(orders))
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
                    "source": "amazon",
                },
                ...
            ]
        """
        raw = self.get_orders(days=days)
        results = []
        for o in raw:
            amount_obj = o.get("OrderTotal", {})
            total = float(amount_obj.get("Amount", 0)) if amount_obj else 0.0
            results.append(
                {
                    "id": o.get("AmazonOrderId", ""),
                    "date": o.get("PurchaseDate", ""),
                    "total": total,
                    "status": o.get("OrderStatus", ""),
                    "fulfillment": o.get("FulfillmentChannel", ""),
                    "source": "amazon",
                }
            )
        return results
