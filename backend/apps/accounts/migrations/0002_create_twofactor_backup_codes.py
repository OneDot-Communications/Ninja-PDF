from django.db import migrations, models
import django.conf
import django.utils.timezone

class Migration(migrations.Migration):

    dependencies = [
        ('apps.accounts', '0001_create_auth_audit_log'),
    ]

    operations = [
        migrations.CreateModel(
            name='TwoFactorBackupCode',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False, verbose_name='ID')),
                ('code_hash', models.CharField(max_length=128)),
                ('used', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('user', models.ForeignKey(on_delete=models.CASCADE, related_name='backup_codes', to=django.conf.settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'twofactor_backup_codes'},
        ),
    ]