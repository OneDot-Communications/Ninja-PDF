from django.db import migrations, models
import django.conf
import django.utils.timezone

class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(django.conf.settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AuthAuditLog',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False, verbose_name='ID')),
                ('event_type', models.CharField(choices=[('successful_login', 'Successful Login'), ('failed_login', 'Failed Login'), ('failed_2fa', 'Failed 2FA'), ('enable_2fa', 'Enable 2FA'), ('disable_2fa', 'Disable 2FA'), ('logout', 'Logout'), ('password_reset', 'Password Reset')], max_length=50)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True, null=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=models.SET_NULL, to=django.conf.settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'auth_audit_logs',
                'ordering': ['-created_at'],
            },
        ),
    ]
