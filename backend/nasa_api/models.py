from django.db import models


class SpatialHazardEvent(models.Model):
    """Spatio-temporal hazard event or calibrated prediction stored in PostgreSQL."""

    event_id = models.CharField(max_length=128, unique=True, db_index=True)
    period = models.CharField(max_length=7, db_index=True)
    date = models.DateField(db_index=True)
    hazard_type = models.CharField(max_length=32, db_index=True)
    name = models.CharField(max_length=200)
    state_clave = models.CharField(max_length=2, db_index=True)
    state_name = models.CharField(max_length=80)
    longitude = models.FloatField()
    latitude = models.FloatField()
    severity = models.FloatField(db_index=True)
    radius_km = models.IntegerField(default=85)
    score = models.FloatField(null=True, blank=True)
    probability = models.FloatField(null=True, blank=True)
    evidence = models.CharField(max_length=32, default="proxy")
    observed = models.BooleanField(default=False, db_index=True)
    source = models.CharField(max_length=200, default="data/processed/spatial_hazard_catalog.parquet")

    class Meta:
        ordering = ["-date", "-severity", "state_clave"]
        indexes = [
            models.Index(fields=["period", "hazard_type"]),
            models.Index(fields=["state_clave", "period"]),
        ]

    def __str__(self) -> str:
        return f"{self.period} · {self.hazard_type} · {self.state_name} ({self.severity})"
