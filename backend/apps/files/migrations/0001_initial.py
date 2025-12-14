from django.db import migrations, models
import django.conf

class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(django.conf.settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='FileAsset',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('uuid', models.UUIDField(unique=True, editable=False)),
                ('name', models.CharField(max_length=255)),
                ('original_name', models.CharField(max_length=255)),
                ('storage_path', models.CharField(max_length=500, blank=True)),
                ('size_bytes', models.BigIntegerField(default=0)),
                ('mime_type', models.CharField(max_length=100, blank=True)),
                ('status', models.CharField(max_length=25, db_index=True)),
                ('version', models.PositiveIntegerField(default=1)),
                ('md5_hash', models.CharField(max_length=32, blank=True, db_index=True)),
                ('sha256_hash', models.CharField(max_length=64, blank=True, db_index=True)),
                ('metadata', models.JSONField(default=dict, blank=True)),
                ('page_count', models.PositiveIntegerField(null=True, blank=True)),
                ('is_encrypted', models.BooleanField(default=False)),
                ('expires_at', models.DateTimeField(null=True, blank=True, db_index=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={'db_table': 'files_fileasset'},
        ),
        migrations.CreateModel(
            name='FileVersion',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('version_number', models.PositiveIntegerField()),
                ('storage_path', models.CharField(max_length=500)),
                ('size_bytes', models.BigIntegerField()),
                ('md5_hash', models.CharField(max_length=32, blank=True)),
                ('sha256_hash', models.CharField(max_length=64, blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('metadata', models.JSONField(default=dict, blank=True)),
            ],
            options={'db_table': 'files_fileversion'},
        ),
    ]
