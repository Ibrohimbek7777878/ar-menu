"""Bo'lim turi: nomidan aniqlash (o'zbek / rus / ingliz) va egasining tanlovi ustunligi."""
from django.test import SimpleTestCase

from categories.kinds import KINDS, guess_kind
from categories.models import Category


class GuessKindTests(SimpleTestCase):
    CASES = {
        'main': ["Milliy taomlar", 'Birinchi taomlar', 'Ikkinchi taomlar', "Sho'rvalar", 'Asosiy taomlar', 'Горячие блюда', 'Main course', 'Kabob'],
        'salad': ['Salatlar', 'Salat & Gazak', 'Салаты', 'Закуски', 'Salads', 'Gazaklar'],
        'dessert': ['Shirinliklar', 'Desertlar', 'Десерты', 'Dessert', 'Tortlar', 'Muzqaymoq', 'Sweets'],
        'drink': ['Ichimliklar', 'Choy va qahva', 'Напитки', 'Drinks', "Sharbat", 'Kofe', 'Suv'],
        'other': ['Pitsa', '', 'Aksiya', 'Non mahsulotlari'],
    }

    def test_names_map_to_the_expected_kind(self):
        for kind, names in self.CASES.items():
            for name in names:
                self.assertEqual(guess_kind(name), kind, name)

    def test_dessert_and_drink_win_over_main_words(self):
        # "Shirin taomlar" shirinlik, "Ichimlik taomlar" kabi aralash nomda ham tavsiya to'g'ri ishlasin
        self.assertEqual(guess_kind('Shirin taomlar'), 'dessert')
        self.assertEqual(guess_kind('Salat taomlar'), 'salad')

    def test_short_words_do_not_match_inside_longer_words(self):
        self.assertEqual(guess_kind('Sokin kunlar'), 'other')
        self.assertEqual(guess_kind('Team menu'), 'other')

    def test_any_of_the_language_names_is_used(self):
        self.assertEqual(guess_kind('Xit', 'Xit', 'Десерты', ''), 'dessert')

    def test_only_documented_kinds_are_returned(self):
        for names in self.CASES.values():
            for name in names:
                self.assertIn(guess_kind(name), KINDS)


class EffectiveKindTests(SimpleTestCase):
    def test_owner_choice_beats_the_guess(self):
        cat = Category(name='Salatlar', name_uz='Salatlar', name_ru='Салаты', kind='dessert')
        self.assertEqual(cat.effective_kind, 'dessert')

    def test_blank_kind_is_guessed_from_the_name(self):
        cat = Category(name='Shirinliklar', name_uz='Shirinliklar', name_ru='Десерты')
        self.assertEqual(cat.kind, '')
        self.assertEqual(cat.effective_kind, 'dessert')
