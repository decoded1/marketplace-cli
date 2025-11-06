"""
Location Handler for Marketplace CLI
Converts ZIP codes, city names, and addresses to platform-specific location parameters
"""

from typing import Dict, List, Optional
from dataclasses import dataclass

@dataclass
class LocationParams:
    """Standardized location parameters for all platforms"""
    zip_code: Optional[str] = None
    city: str = None
    state: str = None
    latitude: float = None
    longitude: float = None
    radius_miles: int = 10

    # Platform-specific mappings
    craigslist_sites: List[str] = None  # e.g., ["philadelphia", "southjersey"]
    craigslist_primary_site: Optional[str] = None
    offerup_city: str = None
    offerup_state: str = None
    facebook_city_code: str = None


# Hardcoded mappings for common locations (can be expanded)
ZIP_TO_LOCATION = {
    "08021": {
        "city": "Pine Hill",
        "state": "New Jersey",
        "latitude": 39.7831,
        "longitude": -74.9958,
        "craigslist_sites": ["southjersey", "philadelphia", "jerseyshore"],
        "craigslist_primary_site": "southjersey",
        "offerup_city": "Newark",  # Closest available OfferUp city
        "offerup_state": "New Jersey",
        "facebook_city_code": "philly"  # Closest Facebook Marketplace
    },
    "19107": {  # Philadelphia
        "city": "Philadelphia",
        "state": "Pennsylvania",
        "latitude": 39.9526,
        "longitude": -75.1652,
        "craigslist_sites": ["philadelphia"],
        "craigslist_primary_site": "philadelphia",
        "offerup_city": "Philadelphia",
        "offerup_state": "Pennsylvania",
        "facebook_city_code": "philly"
    }
}

# City name mappings
CITY_TO_LOCATION = {
    "philadelphia": ZIP_TO_LOCATION["19107"],
    "philly": ZIP_TO_LOCATION["19107"],
    "pine hill": ZIP_TO_LOCATION["08021"],
    "newark": {
        "city": "Newark",
        "state": "New Jersey",
        "latitude": 40.7357,
        "longitude": -74.1724,
        "craigslist_sites": ["newjersey", "philadelphia"],
        "craigslist_primary_site": "newjersey",
        "offerup_city": "Newark",
        "offerup_state": "New Jersey",
        "facebook_city_code": "philadelphia"
    }
}


def normalize_location(location_input: str, radius_miles: int = 10) -> LocationParams:
    """
    Convert user's location input (ZIP, city name, or address) to LocationParams.

    Args:
        location_input: ZIP code, city name, or full address
        radius_miles: Search radius in miles

    Returns:
        LocationParams with platform-specific mappings

    Examples:
        normalize_location("08021", radius_miles=10)
        normalize_location("Philadelphia, PA", radius_miles=15)
        normalize_location("Pine Hill NJ", radius_miles=5)
    """

    # Clean input
    location_input = location_input.strip().lower()

    # Check if it's a ZIP code
    if location_input.replace("-", "").isdigit():
        zip_code = location_input.replace("-", "")
        if zip_code in ZIP_TO_LOCATION:
            data = ZIP_TO_LOCATION[zip_code]
            return LocationParams(
                zip_code=zip_code,
                city=data["city"],
                state=data["state"],
                latitude=data["latitude"],
                longitude=data["longitude"],
                radius_miles=radius_miles,
                craigslist_sites=data["craigslist_sites"],
                craigslist_primary_site=data.get("craigslist_primary_site"),
                offerup_city=data["offerup_city"],
                offerup_state=data["offerup_state"],
                facebook_city_code=data["facebook_city_code"]
            )
        else:
            # Try geocoding (requires geopy)
            try:
                return geocode_location(location_input, radius_miles)
            except:
                raise ValueError(f"ZIP code {zip_code} not in database. Install geopy for automatic geocoding.")

    # Check if it's a known city name
    for city_key, data in CITY_TO_LOCATION.items():
        if city_key in location_input:
            return LocationParams(
                city=data["city"],
                state=data["state"],
                latitude=data["latitude"],
                longitude=data["longitude"],
                radius_miles=radius_miles,
                craigslist_sites=data["craigslist_sites"],
                craigslist_primary_site=data.get("craigslist_primary_site"),
                offerup_city=data["offerup_city"],
                offerup_state=data["offerup_state"],
                facebook_city_code=data["facebook_city_code"]
            )

    # Try geocoding as fallback
    try:
        return geocode_location(location_input, radius_miles)
    except:
        raise ValueError(f"Could not resolve location: {location_input}. Add to hardcoded mappings or install geopy.")


def geocode_location(location_str: str, radius_miles: int = 10) -> LocationParams:
    """
    Use geopy to geocode a location string to lat/lon.
    Falls back to manual mapping if geopy not available.
    """
    try:
        from geopy.geocoders import Nominatim
        from geopy.exc import GeocoderTimedOut, GeocoderServiceError

        geolocator = Nominatim(user_agent="marketplace-cli")
        location = geolocator.geocode(location_str, timeout=10)

        if location:
            # Extract state and city from address
            address_parts = location.address.split(", ")
            city = address_parts[0] if len(address_parts) > 0 else "Unknown"
            state = address_parts[-2] if len(address_parts) > 2 else "Unknown"

            # Try to map to known Craigslist sites (simplified logic)
            craigslist_sites = infer_craigslist_sites(state, city)

            return LocationParams(
                city=city,
                state=state,
                latitude=location.latitude,
                longitude=location.longitude,
                radius_miles=radius_miles,
                craigslist_sites=craigslist_sites,
                craigslist_primary_site=craigslist_sites[0] if craigslist_sites else None,
                offerup_city=city,  # Best guess
                offerup_state=state,
                facebook_city_code=city.lower().replace(" ", "")
            )
        else:
            raise ValueError(f"Could not geocode: {location_str}")

    except ImportError:
        raise ImportError("geopy not installed. Install with: pip install geopy")
    except (GeocoderTimedOut, GeocoderServiceError) as e:
        raise ValueError(f"Geocoding failed: {e}")


def infer_craigslist_sites(state: str, city: str) -> List[str]:
    """
    Infer appropriate Craigslist site codes based on state and city.
    This is a simplified heuristic - expand as needed.
    """
    state_lower = state.lower()
    city_lower = city.lower()

    # Pennsylvania
    if "pennsylvania" in state_lower or "pa" in state_lower:
        return ["philadelphia"]

    # New Jersey
    if "new jersey" in state_lower or "nj" in state_lower:
        if "south" in city_lower or "pine" in city_lower or "camden" in city_lower:
            return ["southjersey", "philadelphia", "jerseyshore"]
        elif "north" in city_lower or "newark" in city_lower:
            return ["newjersey", "newyork"]
        else:
            return ["newjersey", "philadelphia"]

    # New York
    if "new york" in state_lower or "ny" in state_lower:
        return ["newyork"]

    # Default: try nearest major city
    return ["philadelphia"]  # Default fallback


def get_search_params_for_platform(location: LocationParams, platform: str) -> Dict:
    """
    Convert LocationParams to platform-specific search parameters.

    Args:
        location: Normalized location parameters
        platform: "facebook", "offerup", or "craigslist"

    Returns:
        Dictionary of parameters to pass to platform adapter
    """
    if platform == "facebook":
        return {
            "city_code": location.facebook_city_code,
            "latitude": location.latitude,
            "longitude": location.longitude,
            "radius": location.radius_miles
        }

    elif platform == "offerup":
        return {
            "state": location.offerup_state,
            "city": location.offerup_city,
            "pickup_distance": location.radius_miles
        }

    elif platform == "craigslist":
        primary_site = (
            location.craigslist_primary_site
            or (location.craigslist_sites[0] if location.craigslist_sites else None)
        )

        params = {
            "site": primary_site,
            "postal": location.zip_code,
            "search_distance": location.radius_miles if location.zip_code else None,
            "city": location.city,
            "state": location.state,
        }

        if location.craigslist_sites:
            params["sites"] = location.craigslist_sites

        return params

    else:
        raise ValueError(f"Unknown platform: {platform}")


# Example usage
if __name__ == "__main__":
    print("=" * 70)
    print("Location Handler Test")
    print("=" * 70)

    # Test 1: ZIP code
    print("\nTest 1: ZIP code 08021 with 10 mile radius")
    loc = normalize_location("08021", radius_miles=10)
    print(f"  City: {loc.city}, {loc.state}")
    print(f"  Lat/Lon: {loc.latitude}, {loc.longitude}")
    print(f"  Craigslist sites: {loc.craigslist_sites}")
    print(f"  OfferUp: {loc.offerup_city}, {loc.offerup_state}")
    print(f"  Facebook: {loc.facebook_city_code}")

    # Test 2: City name
    print("\nTest 2: City name 'Philadelphia' with 15 mile radius")
    loc = normalize_location("Philadelphia, PA", radius_miles=15)
    print(f"  City: {loc.city}, {loc.state}")
    print(f"  Radius: {loc.radius_miles} miles")

    # Test 3: Platform-specific params
    print("\nTest 3: Get OfferUp parameters for 08021")
    loc = normalize_location("08021", radius_miles=10)
    params = get_search_params_for_platform(loc, "offerup")
    print(f"  OfferUp params: {params}")

    print("\nTest 4: Get Craigslist parameters for 08021")
    params = get_search_params_for_platform(loc, "craigslist")
    print(f"  Craigslist params: {params}")
    if params.get("postal"):
        print("  Mode: ZIP + radius search")
    elif params.get("sites"):
        print(f"  Mode: multi-site fallback across {len(params['sites'])} sites")
