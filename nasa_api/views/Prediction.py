import datetime
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiParameter
from nasa_api.services.catalog import catalog_status, events_for_date


def parse_target_date(params) -> str:
    """Validate YYYY-MM-DD or return tomorrow when no date is provided.

    The aliases ``date``, ``fecha``, ``desde``, and ``hasta`` remain supported
    for frontend compatibility.
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
    """Return a GeoJSON FeatureCollection for a requested date."""

    @extend_schema(
        summary="Indicadores de peligros en GeoJSON",
        description="Devuelve eventos observados o indicadores proxy del catálogo científico para la fecha indicada.",
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

        try:
            features = events_for_date(datetime.date.fromisoformat(date_str))
        except (FileNotFoundError, ValueError) as error:
            return Response({"error": str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        geojson_response = {
            "type": "FeatureCollection",
            "metadata": {
                "date": date_str,
                "count": len(features),
                "region": "México",
                "projection": "Indicadores científicos agregados para México",
                "evidence_policy": "observed, proxy o no_confirmable",
            },
            "features": features,
        }

        return Response(geojson_response, status=status.HTTP_200_OK)


class CatalogStatusView(APIView):
    @extend_schema(summary="Estado del catálogo científico")
    def get(self, request, *args, **kwargs):
        try:
            return Response(catalog_status(), status=status.HTTP_200_OK)
        except (FileNotFoundError, ValueError) as error:
            return Response({"available": False, "error": str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
