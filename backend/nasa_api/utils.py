import base64
import math
import random
import string


class Utils:
    """Small generic helpers retained for application compatibility."""

    @staticmethod
    def random_string(length: int = 10) -> str:
        """Return a random alphanumeric string."""
        characters = string.ascii_letters + string.digits
        return "".join(random.choice(characters) for _ in range(length))

    @staticmethod
    def random_number(length: int = 10) -> str:
        """Return a random string containing digits."""
        return "".join(random.choice(string.digits) for _ in range(length))

    @staticmethod
    def file_to_base64(file_obj) -> str:
        """Encode a readable file object as base64 text."""
        return base64.b64encode(file_obj.read()).decode("utf-8")


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return the great-circle distance between two coordinates in kilometers."""
    earth_radius_km = 6371.0
    latitude_one = math.radians(lat1)
    latitude_two = math.radians(lat2)
    delta_latitude = math.radians(lat2 - lat1)
    delta_longitude = math.radians(lon2 - lon1)
    haversine = (
        math.sin(delta_latitude / 2.0) ** 2
        + math.cos(latitude_one)
        * math.cos(latitude_two)
        * math.sin(delta_longitude / 2.0) ** 2
    )
    haversine = min(1.0, max(0.0, haversine))
    return round(2.0 * earth_radius_km * math.atan2(math.sqrt(haversine), math.sqrt(1.0 - haversine)), 2)
