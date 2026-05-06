"""
adapters/base.py
Abstract base class every adapter must inherit from.
Provides shared HTTP session, retry logic, rate limiting, and logging.
"""

import logging
import time
from abc import ABC, abstractmethod
from typing import Any

import requests
from requests.adapters import HTTPAdapter
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
    before_sleep_log,
)
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------- #
# Retry decorator reused by all adapters
# --------------------------------------------------------------------------- #
def _retryable(fn):
    """Wrap a method with exponential-backoff retry (3 attempts, 2s → 30s cap)."""
    return retry(
        retry=retry_if_exception_type(
            (requests.exceptions.Timeout, requests.exceptions.ConnectionError)
        ),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )(fn)


class BaseAdapter(ABC):
    """
    Base class for all API adapters.

    Subclasses must implement:
        _base_url  → str
        _auth_headers() → dict
    """

    # Number of requests per period (override per adapter if needed)
    _rate_limit_calls: int = 10
    _rate_limit_period: float = 1.0  # seconds

    def __init__(self) -> None:
        self._session = self._build_session()
        self._call_timestamps: list[float] = []

    # ---------------------------------------------------------------------- #
    # Session setup                                                            #
    # ---------------------------------------------------------------------- #
    def _build_session(self) -> requests.Session:
        session = requests.Session()
        # Underlying urllib3 retry handles connection-level failures only.
        # Application-level retries are handled by @_retryable on each method.
        urllib3_retry = Retry(
            total=3,
            backoff_factor=0.5,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET", "POST"],
        )
        adapter = HTTPAdapter(max_retries=urllib3_retry)
        session.mount("https://", adapter)
        session.mount("http://", adapter)
        return session

    # ---------------------------------------------------------------------- #
    # Rate limiting                                                             #
    # ---------------------------------------------------------------------- #
    def _throttle(self) -> None:
        """Sliding-window rate limiter. Blocks until a slot is available."""
        now = time.monotonic()
        # Drop timestamps outside the current period window
        self._call_timestamps = [
            t for t in self._call_timestamps if now - t < self._rate_limit_period
        ]
        if len(self._call_timestamps) >= self._rate_limit_calls:
            sleep_for = self._rate_limit_period - (now - self._call_timestamps[0])
            if sleep_for > 0:
                logger.debug(
                    "%s: rate limit reached — sleeping %.2fs",
                    self.__class__.__name__,
                    sleep_for,
                )
                time.sleep(sleep_for)
        self._call_timestamps.append(time.monotonic())

    # ---------------------------------------------------------------------- #
    # HTTP helpers                                                              #
    # ---------------------------------------------------------------------- #
    @abstractmethod
    def _auth_headers(self) -> dict[str, str]:
        """Return auth headers to attach to every request."""

    def _get(self, url: str, **kwargs: Any) -> dict | list:
        self._throttle()
        headers = {**self._auth_headers(), **kwargs.pop("headers", {})}
        logger.debug("GET %s", url)
        resp = self._session.get(url, headers=headers, timeout=30, **kwargs)
        resp.raise_for_status()
        return resp.json()

    def _post(self, url: str, **kwargs: Any) -> dict | list:
        self._throttle()
        headers = {**self._auth_headers(), **kwargs.pop("headers", {})}
        logger.debug("POST %s", url)
        resp = self._session.post(url, headers=headers, timeout=30, **kwargs)
        resp.raise_for_status()
        return resp.json()
