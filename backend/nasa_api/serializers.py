from rest_framework import serializers


class VersionResponseSerializer(serializers.Serializer):
    version = serializers.CharField(help_text="Versión actual de la API")


class LoginInputSerializer(serializers.Serializer):
    username = serializers.CharField(help_text="Nombre de usuario o correo electrónico")
    password = serializers.CharField(write_only=True, help_text="Contraseña")


class LoginResponseSerializer(serializers.Serializer):
    id = serializers.IntegerField(help_text="Identificador único del usuario")
    username = serializers.CharField(help_text="Nombre de usuario")
    first_name = serializers.CharField(help_text="Nombre")
    last_name = serializers.CharField(help_text="Apellidos")
    email = serializers.EmailField(help_text="Correo electrónico")
    token = serializers.CharField(help_text="Token de autenticación Bearer/Token")


class LogoutResponseSerializer(serializers.Serializer):
    logout = serializers.BooleanField(help_text="Indica si la sesión fue finalizada correctamente")
