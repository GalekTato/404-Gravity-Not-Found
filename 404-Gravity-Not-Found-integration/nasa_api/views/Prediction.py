import datetime
from django.http import HttpResponse
from nasa_api.services.excel import export_workbook
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiParameter
from nasa_api.services.catalog import (
    catalog_status,
    events_for_date,
    events_for_period,
    timemap_summary,
)


def parse_target_period_or_date(params) -> tuple[str | None, str | None]:
    """Return (period YYYY-MM, date YYYY-MM-DD) from query parameters."""
    period = params.get("period") or params.get("periodo") or params.get("month")
    if period:
        period = str(period).strip()[:7]
        datetime.date.fromisoformat(f"{period}-01")
        return period, f"{period}-15"
    date_str = (
        params.get("date")
        or params.get("fecha")
        or params.get("desde")
        or params.get("hasta")
    )
    if not date_str:
        return "2023-09", "2023-09-15"
    if len(str(date_str).strip()) == 7:
        period = str(date_str).strip()
        datetime.date.fromisoformat(f"{period}-01")
        return period, f"{period}-15"
    parsed = datetime.date.fromisoformat(str(date_str).strip())
    return parsed.strftime("%Y-%m"), parsed.isoformat()


class DisastersGeoJSONView(APIView):
    """Return a multi-state GeoJSON FeatureCollection for a TimeMap period or date."""

    @extend_schema(
        summary="Eventos e indicadores geolocalizados por estado en GeoJSON",
        description="Devuelve los eventos observados y pronósticos calibrados distribuidos en los 32 estados de México para el periodo del TimeMap.",
        parameters=[
            OpenApiParameter(
                name="period",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Periodo del TimeMap en formato YYYY-MM",
                required=False,
            ),
            OpenApiParameter(
                name="date",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Fecha en formato YYYY-MM-DD (compatible con clientes existentes)",
                required=False,
            ),
            OpenApiParameter(
                name="type",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filtro opcional por tipo de amenaza (sismo, huracan, sequia, inundacion, incendio)",
                required=False,
            ),
            OpenApiParameter(
                name="state",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filtro opcional por clave de entidad federativa (01..32)",
                required=False,
            ),
        ],
    )
    def get(self, request, *args, **kwargs):
        try:
            period, date_str = parse_target_period_or_date(request.query_params)
        except ValueError:
            return Response(
                {"error": "Fecha o periodo inválido. Utilice YYYY-MM o YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        hazard_type = request.query_params.get("type") or request.query_params.get("tipo")
        state_clave = request.query_params.get("state") or request.query_params.get("entidad")

        try:
            features = events_for_date(
                datetime.date.fromisoformat(date_str),
                hazard_type=hazard_type,
                state_clave=state_clave,
            )
        except (FileNotFoundError, ValueError) as error:
            return Response({"error": str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        geojson_response = {
            "type": "FeatureCollection",
            "metadata": {
                "date": date_str,
                "period": period,
                "count": len(features),
                "region": "México (32 entidades federativas)",
                "projection": "Eventos e indicadores multisensor geolocalizados por entidad y coordenada de impacto",
                "evidence_policy": "observed, supervised, proxy o no_confirmable",
            },
            "features": features,
        }

        return Response(geojson_response, status=status.HTTP_200_OK)


class ExportEventsView(DisastersGeoJSONView):
    @extend_schema(summary="Export filtered indicators as an Excel workbook")
    def get(self, request, *args, **kwargs):
        response = super().get(request, *args, **kwargs)
        if response.status_code != 200:
            return response
        workbook = export_workbook(response.data["features"])
        result = HttpResponse(workbook, content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        period = response.data["metadata"]["period"]
        result["Content-Disposition"] = f'attachment; filename="terrasync-{period}.xlsx"'
        result["Cache-Control"] = "no-store"
        return result


class TimeMapView(APIView):
    """Return the complete interactive timeline with event markers across 2010–2026."""

    @extend_schema(summary="Línea de tiempo (TimeMap) con marcas de eventos y conteos por amenaza")
    def get(self, request, *args, **kwargs):
        hazard_type = request.query_params.get("type") or request.query_params.get("tipo")
        state_clave = request.query_params.get("state") or request.query_params.get("entidad")
        try:
            return Response(
                timemap_summary(hazard_type=hazard_type, state_clave=state_clave),
                status=status.HTTP_200_OK,
            )
        except (FileNotFoundError, ValueError) as error:
            return Response({"available": False, "error": str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


class CatalogStatusView(APIView):
    @extend_schema(summary="Estado del catálogo científico y base de datos PostgreSQL")
    def get(self, request, *args, **kwargs):
        try:
            return Response(catalog_status(), status=status.HTTP_200_OK)
        except (FileNotFoundError, ValueError) as error:
            return Response({"available": False, "error": str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
