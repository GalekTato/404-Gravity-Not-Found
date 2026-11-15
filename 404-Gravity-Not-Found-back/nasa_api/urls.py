from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static

from nasa_api.views.bootstrap import VersionView
from nasa_api.views.auth import CustomAuthToken, Logout
from nasa_api.views.Prediction import DisastersGeoJSONView

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView
)

urlpatterns = [
    path('admin/', admin.site.urls),

    # Sistema y Autenticación
    path("api/version/", VersionView.as_view(), name='api-version'),
    path('api/login/', CustomAuthToken.as_view(), name='api-login'),
    path('api/logout/', Logout.as_view(), name='api-logout'),

    # Predicciones y Simulación de Puntos GeoJSON
    path('api/disasters/', DisastersGeoJSONView.as_view(), name='disasters-geojson'),
    path('api/predictions/', DisastersGeoJSONView.as_view(), name='predictions-geojson'),

    # Documentación Swagger / OpenAPI
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/docs/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
