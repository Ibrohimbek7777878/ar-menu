from rest_framework import serializers
from apps.accounts.models import Staff


class StaffLoginSerializer(serializers.Serializer):
    slug = serializers.SlugField(max_length=64)
    pin = serializers.RegexField(r'^\d{4,6}$', max_length=6)


class StaffSerializer(serializers.ModelSerializer):
    role_label = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = Staff
        fields = ['id', 'full_name', 'phone', 'role', 'role_label', 'tables',
                  'is_on_shift', 'shift_started_at', 'tips_balance', 'is_active']


class StaffWriteSerializer(serializers.ModelSerializer):
    pin = serializers.RegexField(r'^\d{4,6}$', max_length=6, write_only=True,
                                 required=False, allow_blank=True)

    class Meta:
        model = Staff
        fields = ['id', 'full_name', 'phone', 'role', 'tables', 'is_active', 'pin']

    def create(self, validated):
        pin = validated.pop('pin', None)
        staff = Staff.objects.create(**validated)
        if pin:
            from apps.accounts.services import set_pin
            set_pin(staff, pin)
        return staff

    def update(self, instance, validated):
        pin = validated.pop('pin', None)
        for k, v in validated.items():
            setattr(instance, k, v)
        instance.save()
        if pin:
            from apps.accounts.services import set_pin
            set_pin(instance, pin)
        return instance
