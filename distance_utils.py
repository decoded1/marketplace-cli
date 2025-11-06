"""
Distance and routing utilities for marketplace CLI.

Supports:
- Straight-line (geodesic) distance calculations via geopy
- Driving distance/time estimates via OpenRouteService (ORS)

Usage:
    from distance_utils import (
        geocode_location,
        geodesic_distance_miles,
        ors_drive_metrics,
    )
"""

from typing import Optional, Tuple, Dict, Any, List
import os
import requests

try:
    from geopy.distance import geodesic
    from geopy.geocoders import Nominatim
except ImportError as exc:
    raise ImportError(
        "geopy is required for distance utilities. Install with: pip install geopy"
    ) from exc

# Built-in ORS keys provided by the user. These can be supplemented/overridden via
# environment variables or the register_additional_ors_keys helper.
_DEFAULT_ORS_KEYS: List[str] = [
    "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjZmYWUyNzdjYmRmMDQyMTZiYjc2ZDE0NjQzMzVmOWUzIiwiaCI6Im11cm11cjY0In0=",
    "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjhjNmZiZmY1NWM2ZjQyYTVhYmIwNGQzMGUzNGRhMDc4IiwiaCI6Im11cm11cjY0In0=",
]

_additional_ors_keys: List[str] = []
_ors_key_index: int = 0


def register_additional_ors_keys(keys: List[str]) -> None:
    """Add extra OpenRouteService API keys to the rotation pool."""
    global _additional_ors_keys
    cleaned = [k.strip() for k in keys if k and k.strip()]
    _additional_ors_keys.extend(cleaned)


def _gather_ors_keys() -> List[str]:
    """Collect ORS keys from env overrides, registered extras, and defaults."""
    keys: List[str] = []

    # Environment variable (comma-separated) takes highest priority.
    env_keys = os.environ.get("OPENROUTESERVICE_API_KEYS")
    if env_keys:
        keys.extend(
            [k.strip() for k in env_keys.split(",") if k and k.strip()]
        )

    single_env_key = os.environ.get("OPENROUTESERVICE_API_KEY")
    if single_env_key:
        keys.append(single_env_key.strip())

    # Programmatically registered keys
    if _additional_ors_keys:
        keys.extend(_additional_ors_keys)

    # Fall back to baked-in defaults if nothing else provided
    if not keys:
        keys.extend(_DEFAULT_ORS_KEYS)

    # Final cleanup to ensure uniqueness/order preserved with env override first
    seen = set()
    deduped = []
    for key in keys:
        if key and key not in seen:
            deduped.append(key)
            seen.add(key)
    return deduped


def _next_ors_key() -> Optional[str]:
    """Return the next ORS key in rotation, or None if no keys configured."""
    global _ors_key_index
    keys = _gather_ors_keys()
    if not keys:
        return None
    key = keys[_ors_key_index % len(keys)]
    _ors_key_index = (_ors_key_index + 1) % len(keys)
    return key


def geocode_location(
    location: str,
    user_agent: str = "marketplace-cli",
    timeout: int = 10,
) -> Tuple[Optional[float], Optional[float]]:
    """Geocode a textual location (ZIP, address, city) to latitude/longitude."""
    geolocator = Nominatim(user_agent=user_agent)
    result = geolocator.geocode(location, timeout=timeout)
    if result:
        return result.latitude, result.longitude
    return None, None


def geodesic_distance_miles(
    origin: Tuple[float, float],
    destination: Tuple[float, float],
) -> float:
    """Compute straight-line distance in miles between two coordinates."""
    return geodesic(origin, destination).miles


def ors_drive_metrics(
    origin: Tuple[float, float],
    destination: Tuple[float, float],
    api_key: Optional[str] = None,
    profile: str = "driving-car",
    timeout: int = 15,
) -> Optional[Dict[str, Any]]:
    """
    Compute driving distance (km) and duration (seconds) using OpenRouteService.

    Returns:
        {
            "distance_miles": float,
            "distance_km": float,
            "duration_minutes": float,
            "raw": {...}  # raw ORS response
        }
        or None if API key missing / call fails.
    """
    attempted = set()
    while True:
        if api_key and api_key not in attempted:
            current_key = api_key
        else:
            current_key = _next_ors_key()

        if not current_key or current_key in attempted:
            return None

        attempted.add(current_key)

        url = f"https://api.openrouteservice.org/v2/directions/{profile}"
        headers = {
            "Authorization": current_key,
            "Content-Type": "application/json",
        }
        payload = {
            "coordinates": [
                [origin[1], origin[0]],  # ORS expects [lon, lat]
                [destination[1], destination[0]],
            ]
        }

        response = requests.post(url, json=payload, headers=headers, timeout=timeout)
        if response.status_code == 401:
            # Invalid key; try the next one.
            continue
        if response.status_code == 429:
            # Rate-limited; try next key in rotation before giving up.
            continue
        if response.status_code != 200:
            return None

        data = response.json()
        summary = None

        # Handle default JSON structure: {"routes": [{"summary": {...}}]}
        if isinstance(data, dict) and "routes" in data:
            try:
                summary = data["routes"][0]["summary"]
            except (KeyError, IndexError, TypeError):
                summary = None

        # Handle GeoJSON structure: {"features": [{"properties": {"summary": {...}}}]}
        if summary is None and isinstance(data, dict) and "features" in data:
            try:
                summary = data["features"][0]["properties"]["summary"]
            except (KeyError, IndexError, TypeError):
                summary = None

        if summary is None:
            return None

        distance_km = summary.get("distance")
        if distance_km is not None:
            distance_km /= 1000.0
        duration_minutes = summary.get("duration")
        if duration_minutes is not None:
            duration_minutes /= 60.0

        return {
            "distance_km": distance_km,
            "distance_miles": distance_km * 0.621371 if distance_km is not None else None,
            "duration_minutes": duration_minutes,
            "raw": data,
        }


def compute_drive_metrics(
    origin_location: Optional[str],
    destination_coords: Tuple[float, float],
    origin_coords: Optional[Tuple[float, float]] = None,
    fallback_to_geodesic: bool = True,
    attempt_routing: bool = True,
) -> Optional[Dict[str, Any]]:
    """
    Convenience helper: geocode origin (if needed), call ORS, and optionally fall
    back to straight-line miles. Returns None if neither succeeds.
    """
    if not destination_coords or destination_coords[0] is None or destination_coords[1] is None:
        return None

    if not origin_coords:
        if not origin_location:
            return None
        origin_coords = geocode_location(origin_location)
        if not origin_coords or origin_coords[0] is None or origin_coords[1] is None:
            return None

    if attempt_routing:
        metrics = ors_drive_metrics(origin_coords, destination_coords)
        if metrics:
            metrics["origin_coords"] = origin_coords
            metrics["destination_coords"] = destination_coords
            return metrics

    if fallback_to_geodesic:
        distance_miles = geodesic_distance_miles(origin_coords, destination_coords)
        return {
            "distance_miles": distance_miles,
            "distance_km": distance_miles * 1.60934,
            "duration_minutes": None,
            "origin_coords": origin_coords,
            "destination_coords": destination_coords,
            "fallback": "geodesic",
        }

    return None


def get_ip_location(timeout: int = 5) -> Optional[Tuple[Tuple[float, float], Dict[str, Any]]]:
    """Best-effort IP-based geolocation (city-level)."""
    token = os.environ.get("IPINFO_TOKEN")
    url = "https://ipinfo.io/json"
    params = {"token": token} if token else None
    try:
        response = requests.get(url, params=params, timeout=timeout)
        response.raise_for_status()
        data = response.json()
        loc = data.get("loc")
        if not loc:
            return None
        lat_str, lon_str = loc.split(",")
        lat, lon = float(lat_str), float(lon_str)
        return (lat, lon), data
    except Exception:
        return None
