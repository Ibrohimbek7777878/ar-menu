from rest_framework import serializers
from apps.tables.models import FloorPlan
from apps.tables.validators import validate_plan


class FloorPlanListSerializer(serializers.ModelSerializer):
    tables_count = serializers.SerializerMethodField()

    class Meta:
        model = FloorPlan
        fields = ['id', 'name_uz', 'name_ru', 'name_en', 'floor',
                  'sort', 'is_active', 'version', 'tables_count', 'updated_at']

    def get_tables_count(self, obj):
        return len(obj.table_ids())


class FloorPlanDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = FloorPlan
        fields = ['id', 'name_uz', 'name_ru', 'name_en', 'floor', 'sort',
                  'is_active', 'version', 'plan_json', 'updated_at']
        read_only_fields = ['version']

    def validate_plan_json(self, value):
        from apps.tables.models import Table
        rid = self.context['request'].restaurant_id
        allowed = set(Table.objects.filter(
            restaurant_id=rid, is_active=True).values_list('id', flat=True))
        return validate_plan(value, allowed)

    def update(self, instance, validated_data):
        if 'plan_json' in validated_data:
            instance.version = (instance.version or 0) + 1
        return super().update(instance, validated_data)
