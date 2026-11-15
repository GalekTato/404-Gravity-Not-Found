import math
import hashlib
import random
import string
import base64
from typing import List, Dict, Any


class Utils:

    @staticmethod
    def random_string(length=10):
        """Genera una cadena aleatoria alfanumérica."""
        characters = string.ascii_letters + string.digits
        return ''.join(random.choice(characters) for _ in range(length))

    @staticmethod
    def random_number(length=10):
        """Genera una cadena de dígitos aleatoria."""
        digits = string.digits
        return ''.join(random.choice(digits) for _ in range(length))

    @staticmethod
    def file_to_base64(file_obj):
        """Convierte un archivo leído en memoria a string base64."""
        return base64.b64encode(file_obj.read()).decode('utf-8')


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calcula la distancia ortodrómica en kilómetros entre dos coordenadas
    usando la fórmula de Haversine.
    """
    R = 6371.0  # Radio medio de la Tierra en kilómetros

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))

    a = min(1.0, max(0.0, a))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return round(R * c, 2)


# Regiones geoespaciales con propensión climática / sísmica en territorio mexicano
DISASTER_ZONES = {
    "sismo": [
        {"name": "Brecha de Guerrero / Costa Pacífica", "lat": (16.0, 18.0), "lon": (-103.0, -99.0)},
        {"name": "Zona de Subducción Oaxaca", "lat": (15.2, 17.2), "lon": (-98.5, -95.5)},
        {"name": "Fosa de Mesoamérica Chiapas", "lat": (14.6, 16.5), "lon": (-94.0, -92.0)},
        {"name": "Falla de San Andrés / Mexicali", "lat": (31.0, 32.5), "lon": (-116.0, -114.5)},
        {"name": "Eje Volcánico Transversal", "lat": (18.6, 19.8), "lon": (-103.0, -98.5)},
    ],
    "huracan": [
        {"name": "Litoral Pacífico Sur (Oaxaca - Guerrero)", "lat": (15.0, 17.5), "lon": (-102.0, -96.0)},
        {"name": "Litoral Pacífico Occidental (Jalisco - Colima)", "lat": (18.0, 21.0), "lon": (-106.5, -103.5)},
        {"name": "Península de Baja California Sur", "lat": (22.5, 26.5), "lon": (-112.5, -109.0)},
        {"name": "Golfo de México (Veracruz - Tamaulipas)", "lat": (19.5, 24.5), "lon": (-97.5, -94.0)},
        {"name": "Caribe Mexicano / Riviera Maya", "lat": (18.5, 21.5), "lon": (-89.5, -86.8)},
    ],
    "sequia": [
        {"name": "Altiplano Norte (Chihuahua - Coahuila)", "lat": (26.0, 31.0), "lon": (-107.0, -101.0)},
        {"name": "Desierto Sonorense", "lat": (28.0, 32.0), "lon": (-114.0, -110.0)},
        {"name": "Comarca Lagunera / Durango", "lat": (24.0, 26.5), "lon": (-105.5, -102.5)},
        {"name": "Altiplano Central (Zacatecas - San Luis)", "lat": (21.5, 24.5), "lon": (-102.5, -100.0)},
        {"name": "Cuenca del Río Bravo", "lat": (26.0, 29.5), "lon": (-102.0, -98.5)},
    ],
    "inundacion": [
        {"name": "Planicie Tabasqueña (Río Usumacinta/Grijalva)", "lat": (17.2, 18.6), "lon": (-93.5, -91.5)},
        {"name": "Bajo Papaloapan (Sur de Veracruz)", "lat": (17.8, 19.0), "lon": (-96.0, -94.5)},
        {"name": "Soconusco y Costa de Chiapas", "lat": (14.8, 16.2), "lon": (-93.5, -92.0)},
        {"name": "Costa de Nayarit y Marismas Nacionales", "lat": (21.5, 23.0), "lon": (-105.8, -104.8)},
        {"name": "Huasteca Potosina / Veracruzana", "lat": (21.0, 22.8), "lon": (-99.0, -97.5)},
    ],
    "incendio": [
        {"name": "Sierra Madre Occidental (Durango - Sinaloa)", "lat": (23.5, 27.5), "lon": (-106.5, -104.0)},
        {"name": "Sierra Madre Oriental (Nuevo León - Tamaulipas)", "lat": (23.0, 26.0), "lon": (-100.5, -99.0)},
        {"name": "Sierras de San Pedro Mártir y Juárez (BC)", "lat": (30.5, 32.4), "lon": (-116.0, -115.0)},
        {"name": "Eje Neovolcánico / Bosques de Michoacán y Jalisco", "lat": (19.0, 20.2), "lon": (-103.5, -100.5)},
        {"name": "Selva Maya / Calakmul", "lat": (18.0, 19.5), "lon": (-90.5, -88.5)},
    ],
}

DISASTER_TYPES = ["sismo", "huracan", "sequia", "inundacion", "incendio"]

DESCRIPTIVE_NAMES = {
    "sismo": [
        "Enjambre Sísmico Falla Activa",
        "Sismo de Interplaca Continental",
        "Evento Tectónico de Subducción",
        "Alerta de Ruptura Sísmica Mayor",
        "Microsismos Profundos en Falla Regional",
    ],
    "huracan": [
        "Ciclón Tropical de Alta Intensidad",
        "Perturbación Marina Mayor con Tormenta Severa",
        "Huracán Categoría Proyectada",
        "Frente Ciclónico con Mareas de Tempestad",
        "Onda Tropical con Riesgo de Ciclón",
    ],
    "sequia": [
        "Estrés Hídrico Extremo en Cuenca Hidrológica",
        "Anomalía Térmica y Déficit de Precipitación",
        "Sequía Meteorológica Prolongada",
        "Agotamiento Crítico de Humedad del Suelo",
        "Crisis Hídrica por Bloqueo Anticiclónico",
    ],
    "inundacion": [
        "Desbordamiento de Cuenca Baja y Llanuras",
        "Anegación Severa por Precipitaciones Extraordinarias",
        "Inundación Pluvial e Hipersaturación de Terreno",
        "Avenida Extraordinaria de Cauce Fluvial",
        "Riesgo de Ruptura de Bordo e Inundación Costera",
    ],
    "incendio": [
        "Conflagración Forestal en Zona de Bosque Mixto",
        "Incendio de Interfase Urbano-Forestal",
        "Alerta Roja por Focos de Calor Activos",
        "Fuego de Alta Intensidad con Avance Rápido",
        "Frente Ígneo Descontrolado en Sierra Alta",
    ],
}


def generate_disasters_for_date(date_str: str) -> List[Dict[str, Any]]:
    """
    Genera entre 18 y 32 desastres naturales sintéticos en coordenadas de México
    de manera determinista usando la fecha como semilla (MD5 hash).
    La misma fecha siempre producirá exactamente los mismos eventos.
    """
    seed_hash = hashlib.md5(date_str.strip().encode("utf-8")).hexdigest()
    seed_int = int(seed_hash[:8], 16)
    rng = random.Random(seed_int)

    num_events = rng.randint(18, 32)
    features = []

    for i in range(num_events):
        d_type = rng.choice(DISASTER_TYPES)
        zones = DISASTER_ZONES[d_type]
        zone = rng.choice(zones)

        if rng.random() < 0.8:
            lat = rng.uniform(zone["lat"][0], zone["lat"][1])
            lon = rng.uniform(zone["lon"][0], zone["lon"][1])
            zone_label = zone["name"]
        else:
            lat = rng.uniform(14.5, 32.5)
            lon = rng.uniform(-117.0, -86.8)
            zone_label = "Región General de México"

        severity = round(rng.uniform(1.0, 10.0), 1)
        radius_km = rng.randint(50, 400)
        base_name = rng.choice(DESCRIPTIVE_NAMES[d_type])
        descriptive_name = f"{base_name} ({zone_label})"

        feature = {
            "type": "Feature",
            "id": i + 1,
            "geometry": {
                "type": "Point",
                "coordinates": [round(lon, 4), round(lat, 4)],
            },
            "properties": {
                "id": f"geo-{date_str}-{i+1}",
                "type": d_type,
                "severity": severity,
                "radius_km": radius_km,
                "name": descriptive_name,
                "date": date_str,
            },
        }
        features.append(feature)

    return features

