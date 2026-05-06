"""
adapters/tiktok.py
TikTok for Business (Marketing API) adapter.
Docs: https://ads.tiktok.com/marketing_api/docs
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Any

from .base import BaseAdapter, _retryable
from credentials import TikTokCreds

logger = logging.getLogger(__name__)

_BASE_URL = "https://business-api.tiktok.com/open_api/v1.3"

_REPORT_FIELDS = [
    "campaign_id",
    "campaign_name",
    "spend",
    "impressions",
    "clicks",
    "conversion",
]


def _date_range(days: int = 30) -> tuple[str, str]:
    """Return (start_date, end_date) strings for the last N days."""
    end = date.today() - timedelta(days=1)
    start = end - timedelta(days=days - 1)
    return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")


class TikTokAdapter(BaseAdapter):
    """Fetch campaign performance from TikTok Marketing API."""

    _rate_limit_calls = 10
    _rate_limit_period = 1.0

    def __init__(self, creds: TikTokCreds | None = None) -> None:
        super().__init__()
        self._creds = creds or TikTokCreds()

    def _auth_headers(self) -> dict[str, str]:
        return {"Access-Token": self._creds.access_token}

    # ---------------------------------------------------------------------- #
    # Public interface                                                          #
    # ---------------------------------------------------------------------- #
    @_retryable
    def get_campaign_report(self, days: int = 30) -> list[dict[str, Any]]:
        """
        Fetch a synchronous campaign-level report for the last N days.

        Returns:
            List of raw report row dicts.
        """
        start_date, end_date = _date_range(days)
        url = f"{_BASE_URL}/report/integrated/get/"
        params = {
            "advertiser_id": self._creds.advertiser_id,
            "report_type": "BASIC",
            "data_level": "AUCTION_CAMPAIGN",
            "dimensions": '["campaign_id", "campaign_name"]',
            "metrics": str(_REPORT_FIELDS).replace("'", '"'),
            "start_date": start_date,
            "end_date": end_date,
            "page": 1,
            "page_size": 1000,
        }
        rows: list[dict] = []
        while True:
            data = self._get(url, params=params)
            if data.get("code") != 0:
                raise RuntimeError(
                    f"TikTok API error {data.get('code')}: {data.get('message')}"
                )
            page_data = data["data"]["list"]
            rows.extend(page_data)
            page_info = data["data"]["page_info"]
            if params["page"] * params["page_size"] >= page_info["total_number"]:
                break
            params["page"] += 1

        logger.info("TikTok: fetched %d campaign rows", len(rows))
        return rows

    def sync_marketing_data(self, days: int = 30) -> dict[str, Any]:
        """
        Normalised output for the orchestrator.

        Returns:
            {
                "source": "tiktok",
                "campaigns": [
                    {
                        "id": str,
                        "name": str,
                        "spend": float,
                        "impressions": int,
                        "clicks": int,
                        "conversions": int,
                    },
                    ...
                ],
            }
        """
        raw = self.get_campaign_report(days=days)
        campaigns = []
        for row in raw:
            m = row.get("metrics", {})
            d = row.get("dimensions", {})
            campaigns.append(
                {
                    "id": d.get("campaign_id", ""),
                    "name": d.get("campaign_name", ""),
                    "spend": float(m.get("spend", 0)),
                    "impressions": int(m.get("impressions", 0)),
                    "clicks": int(m.get("clicks", 0)),
                    "conversions": int(float(m.get("conversion", 0))),
                }
            )
        return {"source": "tiktok", "campaigns": campaigns}
