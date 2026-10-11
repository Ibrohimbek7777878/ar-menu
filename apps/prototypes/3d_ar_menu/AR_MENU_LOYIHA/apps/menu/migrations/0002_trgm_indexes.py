"""⚡ pg_trgm indekslari — qidiruv (V-041) uchun. Django avtomatik yarata olmaydi."""
from django.db import migrations
from django.contrib.postgres.operations import TrigramExtension, UnaccentExtension


class Migration(migrations.Migration):
    dependencies = [('menu', '0001_initial')]

    operations = [
        TrigramExtension(),
        UnaccentExtension(),
        migrations.RunSQL(
            sql="""
            CREATE INDEX IF NOT EXISTS dish_name_uz_trgm
                ON menu_dish USING gin (name_uz gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS dish_name_ru_trgm
                ON menu_dish USING gin (name_ru gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS dish_name_en_trgm
                ON menu_dish USING gin (name_en gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS dish_desc_uz_trgm
                ON menu_dish USING gin (desc_uz gin_trgm_ops);
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS dish_name_uz_trgm;
            DROP INDEX IF EXISTS dish_name_ru_trgm;
            DROP INDEX IF EXISTS dish_name_en_trgm;
            DROP INDEX IF EXISTS dish_desc_uz_trgm;
            """,
        ),
    ]
