from rest_framework import permissions, status
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from nasa_api.serializers import (
    LoginInputSerializer,
    LoginResponseSerializer,
    LogoutResponseSerializer,
)


class CustomAuthToken(ObtainAuthToken):

    @extend_schema(
        request=LoginInputSerializer,
        summary="Iniciar sesión",
        description="Autentica al usuario con sus credenciales y genera o devuelve un token de acceso.",
        responses={
            200: LoginResponseSerializer,
            400: dict(description="Credenciales inválidas"),
            403: dict(description="Usuario inactivo")
        },
        tags=["Autenticación"]
    )
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        if not user.is_active:
            return Response({"error": "Usuario inactivo"}, status=status.HTTP_403_FORBIDDEN)

        token, _ = Token.objects.get_or_create(user=user)

        return Response({
            'id': user.pk,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'token': token.key,
        })


class Logout(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        request=None,
        summary="Cerrar sesión",
        description="Invalida el token de autenticación del usuario actual.",
        responses={
            200: LogoutResponseSerializer,
            401: dict(description="No autenticado")
        },
        tags=["Autenticación"]
    )
    def post(self, request, *args, **kwargs):
        Token.objects.filter(user=request.user).delete()
        return Response({'logout': True})
