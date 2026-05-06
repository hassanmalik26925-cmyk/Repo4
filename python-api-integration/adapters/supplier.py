"""
adapters/supplier.py
Generic REST supplier adapter (API-key auth).

Your supplier's API must return a JSON list or a JSON object with a list
under a known key. Set SUPPLIER_LIST_KEY (default "products") if needed.
"""

from __future__ import annotations

import logging
import os
from typing import Any

from .base import BaseAdapter, _retryable
from credentials import SupplierCreds

logger = logging.getLogger(__name__)

# The JSON key that contains the product list in the supplier response.
# If the response IS the list (a bare array), set this to an empty string.
_LIST_KEY = os.getenv("SUPPLIER_LIST_KEY", "products")

# Endpoint path for stock (e.g. "/inventory" or "/stock")
_STOCK_PATH = os.getenv("SUPPLIER_STOCK_PATH", "/inventory")

# JSON field mappings — override via env vars to match your supplier schema
_FIELD_SKU = os.getenv("SUPPLIER_FIELD_SKU", "sku")
_FIELD_STOCK = os.getenv("SUPPLIER_FIELD_STOCK", "stock_quantity")
_FIELD_NAME = os.getenv("SUPPLIER_FIELD_NAME", "name")
_FIELD_PRICE = os.getenv("SUPPLIER_FIELD_PRICE", "unit_price")


class SupplierAdapter(BaseAdapter):
    """Fetch stock levels from a generic REST supplier API."""

    _rate_limit_calls = 5
    _rate_limit_period = 1.0

    def __init__(self, creds: SupplierCreds | None = None) -> None:
        super().__init__()
        self._creds = creds or SupplierCreds()

    def _auth_headers(self) -> dict[str, str]:
        return {self._creds.api_key_header: self._creds.api_key}

    # ---------------------------------------------------------------------- #
    # Public interface                                                          #
    # ---------------------------------------------------------------------- #
    @_retryable
    def get_stock(
        self,
        path: str = _STOCK_PATH,
        params: dict | None = None,
    ) -> list[dict[str, Any]]:
        """
        Fetch raw stock data from the supplier API.

        Args:
            path:   API path to call (appended to SUPPLIER_BASE_URL).
            params: Optional query parameters.

        Returns:
            List of raw product dicts.
        """
        url = self._creds.base_url.rstrip("/") + path
        data = self._get(url, params=params or {})

        # Handle both bare-list and wrapped-object responses
        if isinstance(data, list):
            items = data
        elif isinstance(data, dict):
            items = data.get(_LIST_KEY, []) if _LIST_KEY else []
            if not items and not _LIST_KEY:
                # Treat entire dict as single product
                items = [data]
        else:
            items = []

        logger.info("Supplier: fetched %d stock lines", len(items))
        return items

    def sync_supplier_stock(
        self,
        path: str = _STOCK_PATH,
        params: dict | None = None,
    ) -> list[dict[str, Any]]:
        """
        Normalised output for the orchestrator.

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
        raw = self.get_stock(path=path, params=params)
        return [
            {
                "sku": str(item.get(_FIELD_SKU, "")),
                "name": item.get(_FIELD_NAME, ""),
                "stock": int(item.get(_FIELD_STOCK, 0)),
                "price": float(item.get(_FIELD_PRICE, 0)),
                "source": "supplier",
            }
            for item in raw
        ]
