"""Sayr modellari: bazadagi kafolatlar (bitta e'lon qilingan, bitta qayta ishlanayotgan, belgi chegaralari)."""
from django.db import IntegrityError, transaction

from tables_restaurant.models import Hall
from tours.models import Tour, TourHotspot, TourStop
from tours.testkit import TourTestCase


class TourConstraintTests(TourTestCase):

    def test_only_one_published_tour_per_shop_and_hall(self):
        hall = self.A.hall
        Tour.objects.create(shop=self.A.shop, hall=hall, title='1', status=Tour.PUBLISHED)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Tour.objects.create(shop=self.A.shop, hall=hall, title='2', status=Tour.PUBLISHED)
        # boshqa zal va boshqa restoran - ruxsat
        other_hall = Hall.objects.create(shop=self.A.shop, name='Ikkinchi zal')
        Tour.objects.create(shop=self.A.shop, hall=other_hall, title='3', status=Tour.PUBLISHED)
        Tour.objects.create(shop=self.B.shop, hall=self.B.hall, title='4', status=Tour.PUBLISHED)

    def test_hall_less_tours_also_share_one_published_slot(self):
        """NULL zal ham qoida ostida (oddiy qisman noyob indeks NULL'larni farqlab yuborardi)."""
        Tour.objects.create(shop=self.A.shop, title='1', status=Tour.PUBLISHED)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Tour.objects.create(shop=self.A.shop, title='2', status=Tour.PUBLISHED)
        Tour.objects.create(shop=self.B.shop, title='3', status=Tour.PUBLISHED)

    def test_many_unpublished_tours_are_fine(self):
        for status in (Tour.DRAFT, Tour.READY, Tour.FAILED, Tour.READY):
            Tour.objects.create(shop=self.A.shop, title=status, status=status)

    def test_only_one_processing_tour_per_shop(self):
        Tour.objects.create(shop=self.A.shop, title='1', status=Tour.PROCESSING)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Tour.objects.create(shop=self.A.shop, title='2', status=Tour.PROCESSING)
        Tour.objects.create(shop=self.B.shop, title='3', status=Tour.PROCESSING)

    def test_hall_key_follows_the_hall(self):
        tour = Tour.objects.create(shop=self.A.shop, hall=self.A.hall, title='x')
        self.assertEqual(tour.hall_key, self.A.hall.pk)
        tour.hall = None
        tour.save(update_fields=['hall'])
        tour.refresh_from_db()
        self.assertEqual(tour.hall_key, 0)

    def test_hotspot_database_checks(self):
        tour = Tour.objects.create(shop=self.A.shop, title='x', duration_s=10)
        table = self.A.table1
        ok = dict(tour=tour, table=table, t_start=1, t_end=2, x=0.5, y=0.5)
        TourHotspot.objects.create(**ok)
        for bad in ({'t_end': 1}, {'t_end': 0.5}, {'x': 1.5}, {'y': -0.1}, {'t_start': -1, 't_end': 2}):
            with self.assertRaises(IntegrityError, msg=str(bad)), transaction.atomic():
                TourHotspot.objects.create(**{**ok, **bad})

    def test_negative_stop_time_is_rejected(self):
        tour = Tour.objects.create(shop=self.A.shop, title='x', duration_s=10)
        with self.assertRaises(IntegrityError), transaction.atomic():
            TourStop.objects.create(tour=tour, title='x', t=-1)

    def test_deleting_a_table_keeps_the_hotspot_without_a_table(self):
        tour = Tour.objects.create(shop=self.A.shop, title='x', duration_s=10)
        spot = TourHotspot.objects.create(tour=tour, table=self.A.table1, t_start=1, t_end=2, x=0.5, y=0.5)
        self.A.table1.delete()                                  # yumshoq o'chirish: belgi qoladi
        spot.refresh_from_db()
        self.assertEqual(spot.table_id, self.A.table1.pk)
