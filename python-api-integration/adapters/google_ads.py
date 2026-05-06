"""
adapters/google_ads.py
Google Ads API adapter using the official google-ads Python SDK.
Docs: https://developers.google.com/google-ads/api/docs/query/overview
"""

from __future__ import annotations

import logging
from typing import Any

from .base import BaseAdapter, _retryable
from credentials import GoogleAdsCreds

logger = logging.getLogger(__name__)


def _build_gaql(customer_id: str, date_range: str) -> str:
    """Build a GAQL query for campaign performance."""
    return f"""
        SELECT
            campaign.id,
            campaign.name,
            campaign.status,
            metrics.cost_micros,
            metrics.impressions,
            metrics.clicks,
            metrics.conversions
        FROM campaign
        WHERE segments.date DURING {date_range}
          AND campaign.status != 'REMOVED'
        ORDER BY metrics.cost_micros DESC
        LIMIT 1000
    """


class GoogleAdsAdapter(BaseAdapter):
    """
    Fetch campaign performance from Google Ads API (v18).

    NOTE: Uses the official google-ads SDK rather than raw HTTP,
    so _get/_post are not used directly here.
    """

    def __init__(self, creds: GoogleAdsCreds | None = None) -> None:
        super().__init__()
        self._creds = creds or GoogleAdsCreds()
        self._client = self._build_client()

    # The google-ads SDK manages its own session; we satisfy the abstract method.
    def _auth_headers(self) -> dict[str, str]:
        return {}

    def _build_client(self):
        """Initialise google-ads GoogleAdsClient from credentials."""
        try:
            from google.ads.googleads.client import GoogleAdsClient  # type: ignore
        except ImportError as exc:
            raise ImportError(
                "google-ads package not installed. Run: pip install google-ads"
            ) from exc

        config = {
            "developer_token": self._creds.developer_token,
            "client_id": self._creds.client_id,
            "client_secret": self._creds.client_secret,
            "refresh_token": self._creds.refresh_token,
            "use_proto_plus": True,
        }
        if self._creds.login_customer_id:
            config["login_customer_id"] = self._creds.login_customer_id

        return GoogleAdsClient.load_from_dict(config)

    # ---------------------------------------------------------------------- #
    # Public interface                                                          #
    # ---------------------------------------------------------------------- #
    @_retryable
    def get_campaign_performance(
        self, date_range: str = "LAST_30_DAYS"
    ) -> list[dict[str, Any]]:
        """
        Return raw campaign rows for the configured customer.

        Args:
            date_range: GAQL date range constant, e.g. LAST_7_DAYS, LAST_30_DAYS.

        Returns:
            List of row dicts.
        """
        service = self._client.get_service("GoogleAdsService")
        gaql = _build_gaql(self._creds.customer_id, date_range)
        stream = service.search_stream(
            customer_id=self._creds.customer_id, query=gaql
        )
        rows = []
        for batch in stream:
            for row in batch.results:
                rows.append(
                    {
                        "id": str(row.campaign.id),
                        "name": row.campaign.name,
                        "status": row.campaign.status.name,
                        "cost_micros": row.metrics.cost_micros,
                        "impressions": row.metrics.impressions,
                        "clicks": row.metrics.clicks,
                        "conversions": row.metrics.conversions,
                    }
                )
        logger.info("Google Ads: fetched %d campaign rows", len(rows))
        return rows

    def sync_marketing_data(
        self, date_range: str = "LAST_30_DAYS"
    ) -> dict[str, Any]:
        """
        Normalised output for the orchestrator.

        Returns:
            {
                "source": "google_ads",
                "campaigns": [
                    {
                        "id": str,
                        "name": str,
                        "spend": float,       # converted from micros
                        "impressions": int,
                        "clicks": int,
                        "conversions": int,
                    },
                    ...
                ],
            }
        """
        raw = self.get_campaign_performance(date_range=date_range)
        campaigns = [
            {
                "id": r["id"],
                "name": r["name"],
                "spend": r["cost_micros"] / 1_000_000,  # micros → currency unit
                "impressions": int(r["impressions"]),
                "clicks": int(r["clicks"]),
                "conversions": int(r["conversions"]),
            }
            for r in raw
        ]
        return {"source": "google_ads", "campaigns": campaigns}
