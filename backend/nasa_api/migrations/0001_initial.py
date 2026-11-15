from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="SpatialHazardEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("event_id", models.CharField(db_index=True, max_length=128, unique=True)),
                ("period", models.CharField(db_index=True, max_length=7)),
                ("date", models.DateField(db_index=True)),
                ("hazard_type", models.CharField(db_index=True, max_length=32)),
                ("name", models.CharField(max_length=200)),
                ("state_clave", models.CharField(db_index=True, max_length=2)),
                ("state_name", models.CharField(max_length=80)),
                ("longitude", models.FloatField()),
                ("latitude", models.FloatField()),
                ("severity", models.FloatField(db_index=True)),
                ("radius_km", models.IntegerField(default=85)),
                ("score", models.FloatField(blank=True, null=True)),
                ("probability", models.FloatField(blank=True, null=True)),
                ("evidence", models.CharField(default="proxy", max_length=32)),
                ("observed", models.BooleanField(db_index=True, default=False)),
                ("source", models.CharField(default="data/processed/spatial_hazard_catalog.parquet", max_length=200)),
            ],
            options={
                "ordering": ["-date", "-severity", "state_clave"],
                "indexes": [
                    models.Index(fields=["period", "hazard_type"], name="nasa_api_sp_period_7b1a12_idx"),
                    models.Index(fields=["state_clave", "period"], name="nasa_api_sp_state_c_82f019_idx"),
                ],
            },
        ),
    ]
