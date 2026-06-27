# Generated manually — adds metadata (JSONField) and is_read (BooleanField) to Notification

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='notification',
            name='metadata',
            field=models.JSONField(blank=True, null=True, default=None),
        ),
        migrations.AddField(
            model_name='notification',
            name='is_read',
            field=models.BooleanField(default=False),
        ),
    ]
