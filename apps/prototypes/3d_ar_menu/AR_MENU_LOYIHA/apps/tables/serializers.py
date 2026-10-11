from rest_framework import serializers
from apps.tables.models import Hall, Table, TableStatus


class TableSerializer(serializers.ModelSerializer):
    qr_url = serializers.CharField(read_only=True)
    qr_png = serializers.SerializerMethodField()

    class Meta:
        model = Table
        fields = ['id', 'hall', 'number', 'capacity', 'shape',
                  'x', 'y', 'w', 'h', 'rotation', 'status',
                  'assigned_waiter', 'is_active',
                  'qr_token', 'qr_url', 'qr_png', 'qr_rotated_at']
        read_only_fields = ['qr_token', 'qr_url', 'qr_png', 'qr_rotated_at']

    def get_qr_png(self, obj):
        return f'/v1/admin/tables/{obj.id}/qr.png'

    def validate_number(self, v):
        v = str(v).strip()
        if not v:
            raise serializers.ValidationError("Stol raqami bo'sh bo'lmasin")
        return v

    def validate_capacity(self, v):
        if not (1 <= int(v) <= 50):
            raise serializers.ValidationError("Sig'im 1..50 oralig'ida")
        return int(v)

    def validate_hall(self, hall):
        rid = self.context['request'].restaurant_id
        if hall.restaurant_id != rid:
            raise serializers.ValidationError('Zal boshqa restoranga tegishli')
        return hall


class TableStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=TableStatus.choices)


class HallSerializer(serializers.ModelSerializer):
    tables_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Hall
        fields = ['id', 'name', 'name_ru', 'name_en', 'order',
                  'plan_json', 'is_active', 'tables_count']

    def validate_plan_json(self, v):
        if not isinstance(v, dict):
            raise serializers.ValidationError("plan_json obyekt bo'lishi kerak")
        w, h = v.get('width', 0), v.get('height', 0)
        if v and not (0 < int(w) <= 5000 and 0 < int(h) <= 5000):
            raise serializers.ValidationError("width/height 1..5000 oralig'ida")
        objs = v.get('objects', [])
        if not isinstance(objs, list) or len(objs) > 500:
            raise serializers.ValidationError('objects — ro\'yxat, maks 500 element')
        return v


class HallPlanSerializer(serializers.Serializer):
    """Zal plani + stollar joyi bir so'rovda saqlanadi."""
    plan_json = serializers.JSONField()
    tables = serializers.ListField(child=serializers.DictField(), required=False)
