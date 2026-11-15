import os
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from drf_spectacular.utils import extend_schema
from nasa_api.serializers import VersionResponseSerializer


class VersionView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Versión de la API",
        description="Endpoint público que devuelve la versión actual de la API.",
        responses={200: VersionResponseSerializer},
        tags=["Sistema"]
    )
    def get(self, request, *args, **kwargs):
        version = getattr(settings, "APP_VERSION", os.getenv("APP_VERSION", "1.0.0"))
        return Response({"version": version})
