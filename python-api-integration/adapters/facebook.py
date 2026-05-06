"""
adapters/facebook.py
Meta Marketing API adapter.
Docs: https://developers.facebook.com/docs/marketing-api/insights
"""

from __future__ import annotations

import logging
from typing import Any

from .base import BaseAdapter, _retryable
from credentials import FacebookCreds

logger = logging.getLogger(__name__)

# Fields returned for each campaign insight
_INSIGHT_FIELDS = "campaign_name,spend,impressions,clicks,reach,ctr,cpc,actions"

# Date preset options: today, yesterday, last_7d, last_30d, last_month, etc.
DEFAULT_DATE_PRESET = "last_30d"


class FacebookAdapter(BaseAdapter):
    """Fetch campaign performance data from the Meta Marketing API."""

    _rate_limit_calls = 10
    _rate_limit_period = 1.0

    def __init__(self, creds: FacebookCreds | None = None) -> None:
        super().__init__()
        self._creds = creds or FacebookCreds()
        self._base = (
            f"https://graph.facebook.com/{self._creds.api_version}"
        )

    def _auth_headers(self) -> dict[str, str]:
        # Meta uses ?access_token= query param, not a header,
        # but we still return an empty dict to satisfy the abstract method.
        return {}

    def _default_params(self) -> dict[str, str]:
        return {"access_token": self._creds.access_token}

    # ---------------------------------------------------------------------- #
    # Public interface                                                          #
    # ---------------------------------------------------------------------- #
    @_retryable
    def get_campaign_insights(
        self,
        date_preset: str = DEFAULT_DATE_PRESET,
        extra_fields: str = "",
    ) -> list[dict[str, Any]]:
        """
        Return raw campaign insights for the configured ad account.

        Args:
            date_preset: Meta date preset string (e.g. 'last_30d').
            extra_fields: Comma-separated extra field names to append.

        Returns:
            List of insight dicts, one per campaign.
        """
        fields = _INSIGHT_FIELDS
        if extra_fields:
            fields = f"{fields},{extra_fields}"

        url = f"{self._base}/{self._creds.account_id}/insights"
        params = {
            **self._default_params(),
            "level": "campaign",
            "fields": fields,
            "date_preset": date_preset,
            "limit": 500,
        }
        rows: list[dict] = []
        while url:
            data = self._get(url, params=params)
            rows.extend(data.get("data", []))
            # Pagination
            url = data.get("paging", {}).get("next")
            params = {}  # next URL already contains all params

        logger.info("Facebook: fetched %d campaign rows", len(rows))
        return rows

    def sync_marketing_data(
        self, date_preset: str = DEFAULT_DATE_PRESET
    ) -> dict[str, Any]:
        """
        Normalised output for the orchestrator.

        Returns:
            {
                "source": "facebook",
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
        raw = self.get_campaign_insights(date_preset=date_preset)
        campaigns = []
        for row in raw:
            conversions = 0
            for action in row.get("actions") or []:
                if action.get("action_type") in (
                    "offsite_conversion.fb_pixel_purchase",
                    "purchase",
                ):
                    conversions += int(float(action.get("value", 0)))

            campaigns.append(
                {
                    "id": row.get("campaign_id", ""),
                    "name": row.get("campaign_name", ""),
                    "spend": float(row.get("spend", 0)),
                    "impressions": int(row.get("impressions", 0)),
                    "clicks": int(row.get("clicks", 0)),
                    "conversions": conversions,
                }
            )
        return {"source": "facebook", "campaigns": campaigns}
