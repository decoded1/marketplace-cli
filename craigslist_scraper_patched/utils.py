"""
Patched utils for CraigslistScraper.

Enhancements:
  * ZIP + radius aware search URL builder
  * Support for price filters, condition filters, and arbitrary extra parameters
  * Safer price parsing helper
  * Documented Craigslist condition code mappings
"""

from urllib.parse import urlencode
from typing import Dict, Iterable, List, Union, Optional, Any


# Mapping derived from Craigslist form controls.
CRAIGSLIST_CONDITION_CODES: Dict[int, str] = {
    10: "new",
    20: "like new",
    30: "excellent",
    40: "good",
    50: "fair",
    60: "salvage",
}

_CONDITION_NAME_TO_CODE: Dict[str, int] = {
    name: code for code, name in CRAIGSLIST_CONDITION_CODES.items()
}


def _normalize_conditions(conditions: Iterable[Union[int, str]]) -> List[int]:
    """Convert condition inputs (codes or labels) to numeric codes."""
    normalized: List[int] = []
    for value in conditions:
        if isinstance(value, int):
            code = value
        else:
            text = str(value).strip().lower()
            if text.isdigit():
                code = int(text)
            elif text in _CONDITION_NAME_TO_CODE:
                code = _CONDITION_NAME_TO_CODE[text]
            else:
                raise ValueError(f"Unknown Craigslist condition value: {value}")
        if code not in CRAIGSLIST_CONDITION_CODES:
            raise ValueError(f"Unsupported Craigslist condition code: {code}")
        normalized.append(code)
    return normalized


def build_url(
    query: str,
    city: str,
    category: str = "sss",
    postal: str = None,
    search_distance: int = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    conditions: Optional[Iterable[Union[int, str]]] = None,
    extra_params: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Build a Craigslist search URL with advanced filter support.

    Args:
        query: Search term
        city: Craigslist site code (e.g., "southjersey", "philadelphia")
        category: Category code (default "sss" = for sale by owner)
        postal: ZIP code (optional, enables radius search)
        search_distance: Radius in miles (requires postal)
        min_price: Minimum price filter
        max_price: Maximum price filter
        conditions: Iterable of condition codes or labels
        extra_params: Arbitrary query parameters (e.g., {"auto_make_model": "apple iphone"})

    Returns:
        Complete Craigslist search URL

    Examples:
        # Traditional city-based search
        build_url("iphone", "philadelphia", "sss")
        → https://philadelphia.craigslist.org/search/sss?query=iphone

        # ZIP + radius search with additional filters
        build_url(
            "iphone",
            "southjersey",
            "ela",
            postal="08021",
            search_distance=100,
            min_price=40,
            max_price=2000,
            conditions=["new", "like new", "excellent", "good", "fair"],
            extra_params={"auto_make_model": "apple iphone 15 pro"},
        )
        → https://southjersey.craigslist.org/search/ela?postal=08021&query=iphone...
    """
    base_url = f"https://{city}.craigslist.org/search/{category}"

    params: Dict[str, Any] = {}

    # Base location + query parameters
    params["query"] = query
    if postal:
        params["postal"] = postal
        if search_distance is not None:
            params["search_distance"] = search_distance

    # Pricing filters
    if min_price is not None:
        params["min_price"] = int(min_price)
    if max_price is not None:
        params["max_price"] = int(max_price)

    # Condition filters (support multiple selection)
    if conditions:
        params["condition"] = _normalize_conditions(conditions)

    # Arbitrary extra filters (auto_make_model, hasPic, bundleDuplicates, etc.)
    if extra_params:
        for key, value in extra_params.items():
            params[key] = value

    query_string = urlencode(params, doseq=True)
    return f"{base_url}?{query_string}"


def format_price(price_str: str) -> Optional[float]:
    """
    Extract numeric price from price string.

    Args:
        price_str: Price string (e.g., "$123", "$1,234.56")

    Returns:
        Float price value

    Examples:
        format_price("$123") → 123.0
        format_price("$1,234.56") → 1234.56
    """
    if not price_str:
        return None

    # Remove currency symbols and commas
    clean_str = price_str.replace("$", "").replace(",", "").strip()

    try:
        return float(clean_str)
    except ValueError:
        return None
