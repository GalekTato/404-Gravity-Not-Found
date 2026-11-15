import datetime
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiParameter
from nasa_api.utils import generate_disasters_for_date


def parse_target_date(params) -> str:
    """Valida el formato YYYY-MM-DD o devuelve la fecha de mañana por defecto.
    Acepta 'date', 'fecha', 'desde' o 'hasta' para compatibilidad total con el frontend.
    """
    date_str = (
        params.get("date")
        or params.get("fecha")
        or params.get("desde")
        or params.get("hasta")
    )
    if not date_str:
        return (datetime.date.today() + datetime.timedelta(days=1)).isoformat()
    datetime.date.fromisoformat(date_str)
    return date_str


class DisastersGeoJSONView(APIView):
    """
    Endpoint principal: Retorna un FeatureCollection GeoJSON con los puntos
    y características de desastres simulados para una fecha específica (YYYY-MM-DD).
    """

    @extend_schema(
        summary="Puntos de predicción de desastres en GeoJSON",
        description="Genera eventos y coordenadas de desastres simulados para la fecha indicada.",
        parameters=[
            OpenApiParameter(
                name="date",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Fecha en formato YYYY-MM-DD (acepta date, fecha o desde)",
                required=False,
            )
        ],
    )
    def get(self, request, *args, **kwargs):
        try:
            date_str = parse_target_date(request.query_params)
        except ValueError:
            return Response(
                {"error": "Fecha inválida. Utilice el formato YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        features = generate_disasters_for_date(date_str)

        geojson_response = {
            "type": "FeatureCollection",
            "metadata": {
                "date": date_str,
                "count": len(features),
                "region": "México",
                "projection": "Simulación predictiva determinista",
            },
            "features": features,
        }

        return Response(geojson_response, status=status.HTTP_200_OK)
