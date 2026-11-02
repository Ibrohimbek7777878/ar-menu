from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import AdminUser, Customer


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if not user:
            raise serializers.ValidationError('Login yoki parol xato')
        if not user.is_active:
            raise serializers.ValidationError('Hisob bloklangan')
        if not user.is_approved:
            raise serializers.ValidationError('Hisob hali tasdiqlanmagan')
        data['user'] = user
        return data


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminUser
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 'phone',
            'telegram_username', 'role', 'shop', 'is_approved', 'avatar', 'date_joined'
        ]
        read_only_fields = ['id', 'date_joined']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    telegram_username = serializers.CharField(max_length=100, required=False, allow_blank=True)
    # Basic seller uchun ixtiyoriy do'kon yaratish
    shop_name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    shop_address = serializers.CharField(max_length=500, required=False, allow_blank=True)
    shop_lat = serializers.FloatField(required=False, allow_null=True)
    shop_lng = serializers.FloatField(required=False, allow_null=True)

    class Meta:
        model = AdminUser
        fields = [
            'username', 'first_name', 'last_name', 'email', 'password',
            'phone', 'telegram_username', 'role',
            'shop_name', 'shop_address', 'shop_lat', 'shop_lng'
        ]

    def validate(self, data):
        # `support` o'zini o'zi ro'yxatdan o'tkaza olmaydi (is_staff beradi); xodimni egasi qo'shadi
        if data.get('role') and data['role'] not in ['shop_owner', 'shop_manager']:
            raise serializers.ValidationError('Faqat egasi yoki menejer ro\'yxatdan o\'tishi mumkin')
        if data.get('shop_name') and not data.get('shop_address'):
            raise serializers.ValidationError('Do\'kon manzili kiritilishi shart')
        # Django parol qoidalari ("123456", "password" kabi parollar o'tmasin)
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError
        try:
            validate_password(data.get('password', ''), user=AdminUser(
                username=data.get('username', ''), email=data.get('email', ''),
                first_name=data.get('first_name', ''), last_name=data.get('last_name', '')))
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'password': list(exc.messages)})
        return data

    def create(self, validated_data):
        shop_name = validated_data.pop('shop_name', '')
        shop_address = validated_data.pop('shop_address', '')
        shop_lat = validated_data.pop('shop_lat', None)
        shop_lng = validated_data.pop('shop_lng', None)

        from django.db import transaction
        with transaction.atomic():   # do'kon yaratilmasa hisob ham qolmasin (yetim hisob)
            user = AdminUser.objects.create_user(**validated_data)
            user.is_approved = False  # superadmin tasdiqlashi kerak
            user.save(update_fields=['is_approved'])

            if shop_name:
                from shops.models import Shop
                from django.utils.text import slugify   # avval `import slugify` (modul) chaqirilardi: do'kon nomi bilan ro'yxatdan o'tish har doim yiqilardi
                base_slug = slugify(shop_name, allow_unicode=True)[:190] or 'shop'
                slug = base_slug if not Shop.objects.filter(slug=base_slug).exists() else f'{base_slug}-{user.id}'
                shop = Shop.objects.create(
                    name=shop_name,
                    slug=slug,
                    description='',
                    address=shop_address,
                    phone=user.phone or '',
                    latitude=shop_lat or 0.0,
                    longitude=shop_lng or 0.0,
                    owner=user,
                    plan='basic',
                )
                user.shop = shop
                user.save(update_fields=['shop'])

        return user


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'phone', 'address', 'latitude', 'longitude',
            'total_orders', 'total_spent', 'created_at'
        ]
        read_only_fields = ['id', 'total_orders', 'total_spent', 'created_at']


class CustomerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'name', 'phone', 'address', 'latitude', 'longitude']
        read_only_fields = ['id']
