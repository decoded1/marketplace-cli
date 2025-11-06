"""
Patched Craigslist Ad parser.

Extends the upstream implementation by:
  * Preserving the existing lazy-fetch behaviour
  * Capturing posted/updated timestamps from postinginfo blocks
  * Exposing those timestamps in the structured output
"""

from bs4 import BeautifulSoup
import requests
import re
from datetime import datetime, timezone

from typing import Optional
from typing import Union
from typing import List
from typing import Dict
from typing import Tuple

try:
    from .utils import format_price
    from ..distance_utils import compute_drive_metrics  # type: ignore
except ImportError:
    import sys as _sys
    from pathlib import Path as _Path
    root_dir = _Path(__file__).resolve().parent.parent
    if str(root_dir) not in _sys.path:
        _sys.path.insert(0, str(root_dir))
    from utils import format_price  # type: ignore
    from distance_utils import compute_drive_metrics  # type: ignore


class Ad:
    def __init__(
        self,
        url: str,
        price: Optional[float] = None,
        title: Optional[str] = None,
        d_pid: Optional[int] = None,
        description: Optional[str] = None,
        attributes: Optional[Dict] = None,
        image_urls: Optional[List[str]] = None,
        posted_at: Optional[str] = None,
        updated_at: Optional[str] = None,
        posted_label: Optional[str] = None,
        posted_hours_ago: Optional[float] = None,
        posted_date: Optional[str] = None,
        location: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        drive_distance_miles: Optional[float] = None,
        drive_duration_minutes: Optional[float] = None,
    ) -> None:
        """Abstraction for a Craigslist 'Ad'.

        Mirrors the original package interface while adding timestamp fields.
        """
        self.url = url
        self.price = price
        self.title = title
        self.d_pid = d_pid
        self.description = description
        self.attributes = attributes
        self.image_urls = image_urls
        self.posted_at = posted_at
        self.updated_at = updated_at
        self.posted_label = posted_label
        self.posted_hours_ago = posted_hours_ago
        self.posted_date = posted_date
        self.location = location
        self.latitude = latitude
        self.longitude = longitude
        self.drive_distance_miles = drive_distance_miles
        self.drive_duration_minutes = drive_duration_minutes

    def __repr__(self) -> str:
        if (self.title is None) or (self.price is None):
            return f"< {self.url} >"

        return f"< {self.title} (${self.price}): {self.url} >"

    def fetch(self, **kwargs) -> int:
        """Fetch additional data from the URL of the ad."""
        self.request = requests.get(self.url, **kwargs)
        if self.request.status_code == 200:
            parser = AdParser(self.request.content)
            self.price = parser.price
            self.title = parser.title
            self.d_pid = parser.d_pid
            self.description = parser.description
            self.attributes = parser.attributes
            self.image_urls = parser.image_urls
            self.metadata = parser.metadata
            self.posted_at = parser.posted_at
            self.updated_at = parser.updated_at
            if parser.posted_label and not self.posted_label:
                self.posted_label = parser.posted_label
            if parser.location and not self.location:
                self.location = parser.location
            if parser.latitude is not None and parser.longitude is not None:
                self.latitude = parser.latitude
                self.longitude = parser.longitude

            if self.posted_at:
                try:
                    posted_dt = datetime.strptime(self.posted_at, "%Y-%m-%dT%H:%M:%S%z")
                    now = datetime.now(posted_dt.tzinfo or timezone.utc)
                    delta_hours = (now - posted_dt).total_seconds() / 3600.0
                    if delta_hours < 24:
                        self.posted_hours_ago = round(delta_hours, 2)
                        if not self.posted_label:
                            self.posted_label = f"{self.posted_hours_ago}h ago"
                    else:
                        self.posted_date = posted_dt.strftime("%Y-%m-%d")
                        if not self.posted_label:
                            self.posted_label = self.posted_date
                except ValueError:
                    # Leave values unset if parsing fails
                    pass

        return self.request.status_code

    def to_dict(self) -> Dict:
        return {
            "url": self.url,
            "price": self.price,
            "title": self.title,
            "d_pid": self.d_pid,
            "description": self.description,
            "image_urls": self.image_urls,
            "attributes": self.attributes,
            "posted_at": self.posted_at,
            "updated_at": self.updated_at,
            "posted_label": self.posted_label,
            "posted_hours_ago": self.posted_hours_ago,
            "posted_date": self.posted_date,
            "location": self.location,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "drive_distance_miles": self.drive_distance_miles,
            "drive_duration_minutes": self.drive_duration_minutes,
        }

    def compute_drive_metrics(
        self,
        origin_location: Optional[str] = None,
        origin_coords: Optional[Tuple[float, float]] = None,
        fallback_to_geodesic: bool = True,
        attempt_routing: bool = True,
    ) -> Optional[Dict]:
        """
        Populate driving distance/duration fields using shared distance utils.
        Returns the metrics dictionary or None if unavailable.
        """
        if self.latitude is None or self.longitude is None:
            return None

        metrics = compute_drive_metrics(
            origin_location=origin_location,
            destination_coords=(self.latitude, self.longitude),
            origin_coords=origin_coords,
            fallback_to_geodesic=fallback_to_geodesic,
            attempt_routing=attempt_routing,
        )
        if metrics:
            self.drive_distance_miles = metrics.get("distance_miles")
            self.drive_duration_minutes = metrics.get("duration_minutes")
        return metrics


def fetch_ad(url: str, **kwargs) -> Ad:
    """Functional helper to fetch ad information given a URL."""
    ad = Ad(url=url)
    ad.fetch(**kwargs)
    return ad


class AdParser:
    def __init__(self, content: Union[str, bytes], **kwargs) -> None:
        self.soup = BeautifulSoup(content, "html.parser", **kwargs)

        # Remove QR text. Important when parsing the description.
        for qr in self.soup.find_all("p", class_="print-qrcode-label"):
            qr.decompose()

    @property
    def url(self) -> str:
        return self.soup.find("meta", property="og:url")["content"]

    @property
    def price(self) -> Optional[float]:
        element = self.soup.find("span", class_="price")
        if element is not None:
            return format_price(element.text)
        return element

    @property
    def title(self) -> str:
        title_elem = self.soup.find("span", id="titletextonly")
        return title_elem.text if title_elem else ""

    @property
    def d_pid(self) -> Optional[int]:
        match = re.search(r"/(\d+)\.html", self.url)
        return int(match.group(1)) if match else None

    @property
    def description(self) -> Optional[str]:
        body = self.soup.find("section", id="postingbody")
        return body.text if body else None

    @property
    def attributes(self) -> Dict:
        attrs = {}
        for attr_group in self.soup.find_all("p", class_="attrgroup"):
            for attr in attr_group.find_all("span"):
                kv = attr.text.split(": ")
                if len(kv) == 2:
                    attrs[kv[0]] = kv[1]
        return attrs

    @property
    def image_urls(self) -> List[str]:
        return [a.get("href") for a in self.soup.find_all("a", class_="thumb")]

    @property
    def metadata(self) -> List[BeautifulSoup]:
        return self.soup.find_all("meta")

    @property
    def posted_at(self) -> Optional[str]:
        value, _ = self._extract_posting_entry(keyword="posted")
        return value

    @property
    def posted_label(self) -> Optional[str]:
        _, label = self._extract_posting_entry(keyword="posted")
        return label

    @property
    def updated_at(self) -> Optional[str]:
        value, _ = self._extract_posting_entry(keyword="updated")
        return value

    @property
    def location(self) -> Optional[str]:
        location = self.soup.find("div", class_="mapaddress")
        if location:
            return location.get_text(strip=True)
        # Fallback to simple location tag
        location_alt = self.soup.find("small", class_="postingtitletext")
        if location_alt:
            return location_alt.get_text(strip=True)
        return None

    @property
    def latitude(self) -> Optional[float]:
        lat, _ = self._extract_coordinates()
        return lat

    @property
    def longitude(self) -> Optional[float]:
        _, lon = self._extract_coordinates()
        return lon

    def _extract_posting_entry(self, keyword: str) -> Tuple[Optional[str], Optional[str]]:
        """Return (ISO datetime, label text) for a posting info entry."""
        for info in self.soup.find_all("p", class_="postinginfo"):
            text_raw = info.get_text(" ", strip=True)
            if keyword in text_raw.lower():
                time_tag = info.find("time")
                iso = time_tag["datetime"] if time_tag and time_tag.has_attr("datetime") else None
                label = (
                    time_tag.get_text(strip=True)
                    if time_tag
                    else text_raw.split(":", 1)[-1].strip() if ":" in text_raw else text_raw
                )
                return iso, label
        return None, None

    def _extract_coordinates(self) -> Tuple[Optional[float], Optional[float]]:
        map_div = self.soup.find("div", id="map")
        if map_div and map_div.has_attr("data-latitude") and map_div.has_attr("data-longitude"):
            try:
                return float(map_div["data-latitude"]), float(map_div["data-longitude"])
            except (TypeError, ValueError):
                return None, None
        return None, None
