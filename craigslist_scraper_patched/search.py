"""
Patched Craigslist search support.

Enhancements:
  * Gracefully handle missing price fields in search results
  * Allow ZIP + radius aware URL construction
  * Surface advanced filters (price range, conditions, custom query params)
"""

from bs4 import BeautifulSoup
import requests
import re
import os
import sys

from typing import Union, List, Dict, Optional, Tuple

ENABLE_NETWORK_GEOCODING = os.environ.get("MARKETPLACE_ENABLE_GEOCODE", "0").lower() in ("1", "true", "yes")

# Import from original package
import sys
from pathlib import Path
original_package = Path(__file__).parent.parent / 'craigslist-tools' / 'CraigslistScraper'
sys.path.insert(0, str(original_package))
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

try:
    from .ad import Ad
    from ..distance_utils import (
        compute_drive_metrics,
        geocode_location,
        geodesic_distance_miles,
        get_ip_location,
    )  # type: ignore
except ImportError:
    from ad import Ad
    from distance_utils import (
        compute_drive_metrics,
        geocode_location,
        geodesic_distance_miles,
        get_ip_location,
    )  # type: ignore

# Use patched utils so we can handle advanced URL construction + price parsing.
try:
    from .utils import format_price
    from .utils import build_url
    from .utils import CRAIGSLIST_CONDITION_CODES
except ImportError:  # Allow script-style imports when module is on sys.path
    from utils import format_price
    from utils import build_url
    from utils import CRAIGSLIST_CONDITION_CODES


class Search:
    CONDITION_MAP = CRAIGSLIST_CONDITION_CODES

    def __init__(
        self,
        query: str,
        city: str,
        category: str = "sss",
        postal: str = None,
        search_distance: int = None,
        min_price: int = None,
        max_price: int = None,
        conditions: List = None,
        extra_params: Dict = None,
        origin_location: Optional[str] = None,
        origin_coords: Optional[Tuple[float, float]] = None,
    ) -> None:
        """An abstraction for a Craigslist 'Search'. Similar to the 'Ad' this is
        also lazy and follows the same layout with the `fetch()` and `to_dict()`
        methods.

        """
        self.query = query
        self.city = city
        self.category = category
        self.postal = postal
        self.search_distance = search_distance
        self.min_price = min_price
        self.max_price = max_price
        self.conditions = conditions or []
        self.extra_params = extra_params or {}

        origin_provided = origin_location is not None or origin_coords is not None
        origin_set_by_env = False

        if not origin_provided:
            env_origin = os.environ.get("MARKETPLACE_ORIGIN_ADDRESS")
            if env_origin:
                origin_location = env_origin
                origin_set_by_env = True

        self.origin_location = origin_location
        self.origin_coords = origin_coords
        self._geo_cache: Dict[str, Optional[Tuple[Tuple[float, float], Optional[str]]]] = {}

        if self.origin_coords is None and self.origin_location:
            resolved = self._resolve_origin_coords(self.origin_location)
            if resolved:
                self.origin_coords = resolved

        if origin_set_by_env and self.origin_coords is not None:
            self._maybe_prompt_origin_update()

        self.url = build_url(
            query=self.query,
            city=self.city,
            category=self.category,
            postal=self.postal,
            search_distance=self.search_distance,
            min_price=self.min_price,
            max_price=self.max_price,
            conditions=self.conditions,
            extra_params=self.extra_params,
        )
        self.ads: List[Ad] = []

    def fetch(self, **kwargs) -> int:
        self.request = requests.get(self.url, **kwargs)
        if self.request.status_code == 200:
            parser = SearchParser(
                self.request.content,
                origin_location=self.origin_location,
                origin_coords=self.origin_coords,
                geo_cache=self._geo_cache,
                site_code=self.city,
            )
            self.ads = parser.ads

        return self.request.status_code

    def to_dict(self) -> Dict:
        return {
            "query": self.query,
            "city": self.city,
            "category": self.category,
            "postal": self.postal,
            "search_distance": self.search_distance,
            "min_price": self.min_price,
            "max_price": self.max_price,
            "conditions": self.conditions,
            "extra_params": self.extra_params,
            "url": self.url,
            "ads": [ad.to_dict() for ad in self.ads]
        }

    def _resolve_origin_coords(self, origin_location: str) -> Optional[Tuple[float, float]]:
        """Attempt to resolve origin coordinates via location handler or geocoding."""
        try:
            from location_handler import normalize_location  # type: ignore

            normalized = normalize_location(origin_location)
            if normalized.latitude is not None and normalized.longitude is not None:
                return (normalized.latitude, normalized.longitude)
        except Exception:
            pass

        try:
            coords = geocode_location(origin_location)
            if coords and coords[0] is not None and coords[1] is not None:
                return coords
        except Exception:
            pass

        return None

    def _maybe_prompt_origin_update(self) -> None:
        if not sys.stdin.isatty():
            return

        ip_result = get_ip_location()
        if not ip_result or self.origin_coords is None:
            return

        ip_coords, ip_meta = ip_result
        try:
            distance = geodesic_distance_miles(self.origin_coords, ip_coords)
        except Exception:
            return

        if distance <= 30:
            return

        ip_city = ip_meta.get("city")
        ip_region = ip_meta.get("region")
        ip_desc = ", ".join(filter(None, [ip_city, ip_region])) or "your current area"

        print(
            f"Detected IP location {ip_desc} differs from the configured origin by approximately "
            f"{distance:.1f} miles."
        )
        try:
            resp = input("Do you want to update the origin location? (y/N): ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            print()
            return

        if resp not in {"y", "yes"}:
            return

        try:
            new_origin = input("Enter new origin (leave blank to keep current): ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return

        if not new_origin:
            return

        new_coords = self._resolve_origin_coords(new_origin)
        if new_coords:
            self.origin_location = new_origin
            self.origin_coords = new_coords
        else:
            print("Could not resolve that origin. Keeping existing location.")


def fetch_search(
    query: str,
    city: str,
    category: str = "sss",
    postal: str = None,
    search_distance: int = None,
    min_price: int = None,
    max_price: int = None,
    conditions: List = None,
    extra_params: Dict = None,
    origin_location: Optional[str] = None,
    origin_coords: Optional[Tuple[float, float]] = None,
    **kwargs,
) -> Search:
    """Functional implementation of a Craigslist search."""
    search = Search(
        query=query,
        city=city,
        category=category,
        postal=postal,
        search_distance=search_distance,
        min_price=min_price,
        max_price=max_price,
        conditions=conditions,
        extra_params=extra_params,
        origin_location=origin_location,
        origin_coords=origin_coords,
    )
    search.fetch(**kwargs)
    return search


class SearchParser:
    SITE_COORDS: Dict[str, Tuple[float, float]] = {
        "philadelphia": (39.9526, -75.1652),
        "southjersey": (39.7831, -74.9958),
        "jerseyshore": (39.9470, -74.1710),
        "washingtondc": (38.9072, -77.0369),
        "baltimore": (39.2904, -76.6122),
        "newyork": (40.7128, -74.0060),
    }

    FILTER_PATTERNS = [
        # Buyer / reseller phrases
        re.compile(r"\bwe\s*buy\b", re.IGNORECASE),
        re.compile(r"\bbuyer(s)?\b", re.IGNORECASE),
        re.compile(r"\bbuying\b", re.IGNORECASE),
        re.compile(r"\bsell\s+me\s+your\b", re.IGNORECASE),
        re.compile(r"\bcash\s+for\b", re.IGNORECASE),
        re.compile(r"\boffer\s+cash\b", re.IGNORECASE),
        re.compile(r"\btop\s+\w*\s*buyer\b", re.IGNORECASE),
        # Repair / service listings
        re.compile(r"\brepair(s|ing)?\b", re.IGNORECASE),
        re.compile(r"\bfix(ing)?\b", re.IGNORECASE),
        # Accessories (cases, chargers, cables, etc.)
        re.compile(r"\bcase(s)?\b", re.IGNORECASE),
        re.compile(r"screen\s*protector", re.IGNORECASE),
        re.compile(r"privacy\s+screen", re.IGNORECASE),
        re.compile(r"\bcharger(s)?\b", re.IGNORECASE),
        re.compile(r"\bcable(s)?\b", re.IGNORECASE),
        re.compile(r"\bholster(s)?\b", re.IGNORECASE),
        re.compile(r"\bwallet\b", re.IGNORECASE),
        re.compile(r"charging\s+station", re.IGNORECASE),
        re.compile(r"wireless\s+charging", re.IGNORECASE),
        re.compile(r"charge\s+card", re.IGNORECASE),
    ]

    def __init__(
        self,
        content: Union[str, bytes],
        origin_location: Optional[str] = None,
        origin_coords: Optional[Tuple[float, float]] = None,
        geo_cache: Optional[Dict[str, Tuple[Optional[float], Optional[float]]]] = None,
        site_code: Optional[str] = None,
        **kwargs,
    ) -> None:
        self.soup = BeautifulSoup(content, "html.parser", **kwargs)
        self.origin_location = origin_location
        self.origin_coords = origin_coords
        self.geo_cache = geo_cache if geo_cache is not None else {}
        self.site_code = site_code

    @property
    def ads(self) -> List[Ad]:
        ads = []
        for ad_html in self.soup.find_all("li", class_ = "cl-static-search-result"):
            try:
                url = ad_html.find("a")["href"]
                title_elem = ad_html.find(class_ = "title")
                title = title_elem.text if title_elem else "Unknown Title"

                if self._is_filtered_title(title):
                    continue

                # FIX: Handle missing price gracefully
                price_elem = ad_html.find(class_ = "price")
                price = format_price(price_elem.text) if price_elem else None

                posted_label, posted_hours_ago, posted_date, location = self._parse_meta(ad_html)

                # Extract post ID
                url_match = re.search(r"/(\d+)\.html", url)
                d_pid = int(url_match.group(1)) if url_match else None

                ad = Ad(
                    url=url,
                    title=title,
                    price=price,
                    d_pid=d_pid,
                    posted_label=posted_label,
                    posted_hours_ago=posted_hours_ago,
                    posted_date=posted_date,
                    location=location,
                )

                # Compute approximate drive metrics if origin provided.
                if (self.origin_location or self.origin_coords) and location:
                    approx_result = self._geocode_location(location, url)
                    if approx_result:
                        approx_coords, quality = approx_result
                    else:
                        approx_coords = quality = None

                    if (
                        approx_coords
                        and approx_coords[0] is not None
                        and approx_coords[1] is not None
                        and self._is_useful_approximation(approx_coords, quality)
                    ):
                        metrics = compute_drive_metrics(
                            origin_location=self.origin_location,
                            origin_coords=self.origin_coords,
                            destination_coords=approx_coords,
                            fallback_to_geodesic=True,
                            attempt_routing=False,
                        )
                        if metrics:
                            ad.drive_distance_miles = metrics.get("distance_miles")
                            ad.drive_duration_minutes = metrics.get("duration_minutes")

                ads.append(ad)
            except Exception as e:
                # Skip malformed ads but continue parsing
                print(f"Warning: Skipped ad due to parsing error: {e}")
                continue

        return ads

    @staticmethod
    def _parse_meta(ad_html) -> Tuple[Optional[str], Optional[float], Optional[str], Optional[str]]:
        """Extract posted label, parsed hours/date, and location from search result card."""
        meta_div = ad_html.find("div", class_="meta")
        posted_label = None
        posted_hours_ago = None
        posted_date = None
        location = None

        if meta_div:
            parts = list(meta_div.stripped_strings)
            if parts:
                posted_label = parts[0]
            if len(parts) > 1:
                location = parts[1]

        if not location:
            location_div = ad_html.find("div", class_="location")
            if location_div:
                location = location_div.get_text(strip=True)

        if posted_label:
            lower = posted_label.lower()
            if "ago" in lower:
                hours = SearchParser._convert_relative_time_to_hours(lower)
                if hours is not None:
                    posted_hours_ago = hours
            else:
                posted_date = posted_label

        return posted_label, posted_hours_ago, posted_date, location

    @staticmethod
    def _convert_relative_time_to_hours(label: str) -> Optional[float]:
        """Convert strings like '4h ago', '30m ago', '2d ago' into hours."""
        label = label.replace("ago", "").strip()
        match = re.match(r"(?P<value>\d+)(?P<unit>[mhd])", label)
        if not match:
            return None
        value = int(match.group("value"))
        unit = match.group("unit")
        if unit == "m":
            return round(value / 60, 2)
        if unit == "h":
            return float(value)
        if unit == "d":
            return float(value * 24)
        return None

    def _is_useful_approximation(
        self,
        coords: Tuple[float, float],
        quality: Optional[str]
    ) -> bool:
        """Determine whether approximate coordinates should be used."""
        if coords is None:
            return False

        if self.origin_coords:
            try:
                distance = geodesic_distance_miles(self.origin_coords, coords)
            except Exception:
                distance = None

            if distance is not None and distance < 0.5:
                # Treat anything within half a mile of the origin as effectively unknown.
                return False

        return True

    def _geocode_location(self, neighborhood: str, url: str) -> Optional[Tuple[Tuple[float, float], Optional[str]]]:
        key = neighborhood.strip().lower()
        if key in self.geo_cache:
            return self.geo_cache[key]

        # Derive city from URL host if available (philadelphia.craigslist.org).
        city = None
        match = re.search(r"https?://([^.]+)\.craigslist\.org", url)
        if match:
            city_part = match.group(1)
            city = city_part.replace("-", " ")

        query_parts = [neighborhood]
        if city:
            query_parts.append(city)
        query_string = ", ".join(query_parts)

        lat = lon = None
        lat = lon = None
        quality: Optional[str] = None
        if ENABLE_NETWORK_GEOCODING:
            try:
                lat, lon = geocode_location(query_string)
                if lat is not None and lon is not None:
                    quality = "geocode"
            except Exception:
                lat = lon = None

        if (lat is None or lon is None) and city:
            fallback_key = city.split()[0].lower()
            coords = self.SITE_COORDS.get(fallback_key)
            if coords:
                lat, lon = coords
                quality = "city"

        if (lat is None or lon is None) and self.site_code:
            coords = self.SITE_COORDS.get(self.site_code.lower())
            if coords:
                lat, lon = coords
                quality = "site"

        result = ((lat, lon), quality) if lat is not None and lon is not None else None
        self.geo_cache[key] = result
        return result

    def _is_filtered_title(self, title: str) -> bool:
        if not title:
            return False
        for pattern in self.FILTER_PATTERNS:
            if pattern.search(title):
                return True
        return False
