"""Brend ranglari (shops/brand_color.py): sof funksiyalar. Hex tekshiruvi, kontrast hisobi, avto-to'qlashtirish, token to'plami,
CSS bloklari va XSS. Kontrast talablari (WCAG AA 4.5:1) har xil ranglar to'ri bo'yicha tekshiriladi, faqat bitta rangda emas."""
import itertools
import re

from django.test import SimpleTestCase

from shops import brand_color as bc

HEX6 = re.compile(r'#[0-9A-F]{6}')


def _grid():
    """Rang fazosining tekis to'ri (oq, qora, kulrang, sariq, to'yingan va och ranglar kiradi): 6^3 = 216 ta."""
    steps = (0, 51, 102, 153, 204, 255)
    return [bc.rgb_to_hex(r, g, b) for r, g, b in itertools.product(steps, repeat=3)]


class HexTests(SimpleTestCase):

    def test_valid_forms_are_normalised_to_uppercase_rrggbb(self):
        self.assertEqual(bc.normalize_hex('#abc'), '#AABBCC')
        self.assertEqual(bc.normalize_hex('#2f4836'), '#2F4836')
        self.assertEqual(bc.normalize_hex('  #2F4836  '), '#2F4836')
        self.assertEqual(bc.normalize_hex('#2F4836\n'), '#2F4836')           # chetdagi bo'shliq/yangi qator kesiladi
        self.assertEqual(bc.normalize_hex('#FfF'), '#FFFFFF')

    def test_everything_else_is_rejected(self):
        for bad in (None, '', '   ', 'red', '2F4836', '#12', '#12345', '#1234567', '#GGGGGG', '#12 456', 'rgb(1,2,3)', '#2F4836;}',
                    '#2F48\n36', '#2F48360', 5, 5.5, [], {}, True, '#٣٣٣', '＃2F4836', "#fff'}</style><script>alert(1)</script>",
                    'url(javascript:alert(1))', '#fff #fff'):
            self.assertIsNone(bc.normalize_hex(bad), repr(bad))

    def test_rgb_roundtrip_and_invalid_input(self):
        self.assertEqual(bc.hex_to_rgb('#2F4836'), (47, 72, 54))
        self.assertEqual(bc.rgb_to_hex(47, 72, 54), '#2F4836')
        self.assertEqual(bc.rgb_to_hex(-5, 300, 12.6), '#00FF0D')
        with self.assertRaises(ValueError):
            bc.hex_to_rgb('red')
        self.assertEqual(bc.rgb_triplet('#2F4836'), '47 72 54')


class ContrastTests(SimpleTestCase):

    def test_known_ratios(self):
        self.assertAlmostEqual(bc.contrast_ratio('#000000', '#FFFFFF'), 21.0, places=2)
        self.assertAlmostEqual(bc.contrast_ratio('#FFFFFF', '#FFFFFF'), 1.0, places=2)
        self.assertAlmostEqual(bc.contrast_ratio('#767676', '#FFFFFF'), 4.54, places=2)      # WCAG ma'lum chegara
        self.assertAlmostEqual(bc.contrast_ratio('#2F4836', '#FFFFFF'), 9.99, places=1)
        self.assertEqual(bc.contrast_ratio('#123456', '#ABCDEF'), bc.contrast_ratio('#ABCDEF', '#123456'))

    def test_ensure_contrast_keeps_a_good_color_untouched(self):
        self.assertEqual(bc.ensure_contrast('#2F4836', ('#FFFFFF', bc.CREAM)), ('#2F4836', False))

    def test_ensure_contrast_darkens_minimally_and_keeps_the_hue(self):
        result, changed = bc.ensure_contrast('#FF8800', ('#FFFFFF',))
        self.assertTrue(changed)
        self.assertGreaterEqual(bc.contrast_ratio(result, '#FFFFFF'), 4.5)
        # "Eng kichik o'zgarish": bir qadam yorqinroq rang endi o'tmasligi kerak (ya'ni natija chegarada)
        lighter = bc.mix(result, '#FFFFFF', 0.03)
        self.assertLess(bc.contrast_ratio(lighter, '#FFFFFF'), 4.6)
        r, g, b = bc.hex_to_rgb(result)
        self.assertTrue(r > g > b)                                    # to'q-sariq/jigarrang: tus saqlangan

    def test_lighten_for_dark_backgrounds(self):
        result, changed = bc.ensure_contrast('#102030', (bc.DARK_BG, bc.DARK_SURFACE), lighter=True)
        self.assertTrue(changed)
        for bg in (bc.DARK_BG, bc.DARK_SURFACE):
            self.assertGreaterEqual(bc.contrast_ratio(result, bg), 4.5)


class BoundaryColorTests(SimpleTestCase):
    """Chegara ranglar: oq, sariq, juda och, qora, kulrang — saytni o'qib bo'lmaydigan qilmasligi shart."""

    def assert_readable(self, derived, label):
        p, a = derived['primary'], derived['accent']
        light = derived['light_guest']
        for name, color in (('primary', p), ('accent', a)):
            for bg in (bc.WHITE, bc.CREAM):
                self.assertGreaterEqual(bc.contrast_ratio(color, bg), 4.5, f'{label}: {name} / {bg}')
        # tugma: oq matn asosiy rang ustida; hover ham
        self.assertGreaterEqual(bc.contrast_ratio(bc.WHITE, p), 4.5, label)
        self.assertGreaterEqual(bc.contrast_ratio(bc.WHITE, light['--brand-primary-hover']), 4.5, label)
        # tun
        dark = derived['dark_guest']
        self.assertGreaterEqual(bc.contrast_ratio(bc.WHITE, dark['--brand-primary']), 4.5, f'{label}: tun tugma')
        self.assertGreaterEqual(bc.contrast_ratio(bc.WHITE, dark['--brand-primary-hover']), 4.5, f'{label}: tun hover')
        for bg in (bc.DARK_BG, bc.DARK_SURFACE, bc.DARK_SUBTLE, bc.DARK_HOVER, dark['--brand-primary-light'], dark['--brand-primary-subtle']):
            self.assertGreaterEqual(bc.contrast_ratio(derived['text_on_dark'], bg), 4.5, f'{label}: tun matn / {bg}')
            self.assertGreaterEqual(bc.contrast_ratio(derived['accent_text_on_dark'], bg), 4.5, f'{label}: tun urg\'u matn / {bg}')
        self.assertGreaterEqual(bc.contrast_ratio(dark['--brand-primary'], bc.DARK_SURFACE), 2.0, f'{label}: tugma sirtdan ajralishi')

    def test_white_yellow_very_light_black_gray(self):
        cases = {
            'oq': '#FFFFFF', 'sariq': '#FFD400', 'limon': '#FFFF00', 'juda och': '#FFFFF0', 'och kulrang': '#F0F0F0',
            'qora': '#000000', 'kulrang': '#808080', 'to\'q ko\'k': '#0A0A23', 'qizil': '#FF0000', 'apelsin': '#EA580C',
            'moviy': '#0000FF', 'och yashil': '#B6FFB6', 'pushti': '#FFC0CB',
        }
        for label, color in cases.items():
            self.assert_readable(bc.derive_brand(color), label)

    def test_light_colors_are_adjusted_and_reported(self):
        for color in ('#FFFFFF', '#FFD400', '#FFFFF0', '#F0F0F0', '#FFFF00'):
            derived = bc.derive_brand(color)
            self.assertTrue(derived['primary_adjusted'], color)
            self.assertEqual(derived['primary_from'], color)
            self.assertNotEqual(derived['primary'], color)

    def test_good_colors_are_not_touched(self):
        # Shu jumladan admin "tayyor ranglar" (#0F766E, #C2410C): shartnoma bo'yicha oq/krem bilan >= 4.5 yetarli, ogohlantirish yo'q
        for color in ('#2F4836', '#1E3A5F', '#8B1E3F', '#0F766E', '#6B2D5C', '#78350F', '#B91C1C', '#C2410C', '#4F46E5'):
            derived = bc.derive_brand(color)
            self.assertFalse(derived['primary_adjusted'], color)
            self.assertEqual(derived['primary'], color)

    def test_default_and_garbage_input_fall_back_to_the_classic_green(self):
        for garbage in (None, '', 'red', 5, [], {}, '#12', "<script>"):
            derived = bc.derive_brand(garbage)
            self.assertEqual(derived['primary'], bc.DEFAULT_PRIMARY, repr(garbage))
            self.assertFalse(derived['primary_adjusted'])
        derived = bc.derive_brand('#2F4836', 'garbage')
        self.assertTrue(derived['accent_auto'])

    def test_accent_is_optional_and_derived_from_primary(self):
        derived = bc.derive_brand('#1E3A5F')
        self.assertTrue(derived['accent_auto'])
        self.assertEqual(derived['accent'], derived['primary'])
        explicit = bc.derive_brand('#1E3A5F', '#9A3412')
        self.assertFalse(explicit['accent_auto'])
        self.assertEqual(explicit['accent'], '#9A3412')

    def test_bright_accent_is_darkened_too(self):
        derived = bc.derive_brand('#2F4836', '#FFC107')
        self.assertTrue(derived['accent_adjusted'])
        self.assertEqual(derived['accent_from'], '#FFC107')
        for bg in (bc.WHITE, bc.CREAM):
            self.assertGreaterEqual(bc.contrast_ratio(derived['accent'], bg), 4.5)

    def test_whole_color_grid_is_readable(self):
        """216 ta rang: har biri uchun kunduz ham, tun ham talablar bajariladi (oq/qora/sariq/to'yingan/kulrang shu yerda)."""
        for color in _grid():
            self.assert_readable(bc.derive_brand(color, color), color)

    def test_derivation_is_deterministic(self):
        self.assertEqual(bc.derive_brand('#8B1E3F', '#B45309'), bc.derive_brand('#8b1e3f', '#b45309'))


class TokenSetTests(SimpleTestCase):

    def test_classic_green_derives_the_known_classic_scale(self):
        light = bc.derive_brand('#2F4836')['light_guest']
        self.assertEqual(light['--brand-primary'], '#2F4836')
        self.assertEqual(light['--brand-primary-hover'], '#25382A')        # klassik #24382A bilan 1 birlik farq (×0.78)
        self.assertEqual(light['--brand-primary-rgb'], '47 72 54')

    def test_token_names_cover_the_contract(self):
        derived = bc.derive_brand('#8B1E3F', '#B45309')
        guest = {'--brand-primary', '--brand-primary-hover', '--brand-primary-light', '--brand-primary-subtle', '--brand-tint-2',
                 '--brand-tint-3', '--brand-deep', '--brand-primary-rgb', '--brand-accent', '--brand-accent-light',
                 '--brand-accent-subtle', '--brand-warm'}
        admin = {'--action', '--action-hover', '--accent-amber'}
        self.assertTrue(guest <= set(derived['light_guest']))
        self.assertTrue(guest - {'--brand-accent'} <= set(derived['dark_guest']))
        self.assertTrue(admin <= set(derived['light_admin']))
        self.assertTrue(admin <= set(derived['dark_admin']))
        self.assertTrue({'--dk-brand-text', '--dk-accent-text'} <= set(derived['dark_guest']))

    def test_status_colors_are_not_brand_derived(self):
        a, b = bc.derive_brand('#8B1E3F'), bc.derive_brand('#0F766E')
        for derived in (a, b):
            for table in ('light_guest', 'dark_guest', 'light_admin', 'dark_admin'):
                self.assertFalse([k for k in derived[table] if k.startswith('--status-')], table)


class CssTests(SimpleTestCase):

    def test_two_blocks_day_and_night_for_each_scope(self):
        for scope in ('guest', 'admin', 'all'):
            css = bc.build_brand_css('#8B1E3F', '#B45309', scope)
            blocks = css.split('\n')
            self.assertEqual(len(blocks), 2, scope)
            self.assertTrue(blocks[0].startswith("html[data-palette='custom']{"), scope)
            self.assertTrue(blocks[1].startswith("html[data-palette='custom'][data-theme='dark']{"), scope)
            self.assertTrue(all(b.endswith('}') for b in blocks))
            self.assertIn('--brand-primary:' if scope != 'admin' else '--action:', blocks[0])

    def test_scopes_split_guest_and_admin_tokens_and_never_emit_neutrals(self):
        guest = bc.build_brand_css('#8B1E3F', None, 'guest')
        admin = bc.build_brand_css('#8B1E3F', None, 'admin')
        both = bc.build_brand_css('#8B1E3F', None, 'all')
        self.assertIn('--brand-primary:#8B1E3F', guest)
        self.assertNotIn('--action:', guest)                          # admin tokenlari mehmon sahifasida yo'q
        self.assertIn('--action:#8B1E3F', admin)
        self.assertNotIn('--brand-primary:', admin)
        self.assertIn('--dk-brand-text', guest)
        self.assertIn('--primary-green:#8B1E3F', guest)               # eski Django shablon o'zgaruvchisi ham brendga ergashadi
        self.assertGreater(both.count(';'), guest.count(';'))
        self.assertGreater(both.count(';'), admin.count(';'))
        # Neytral va holat tokenlari (fon, matn, chegara, status) bu yerda YO'Q: ularni sahifaning o'z stillari beradi
        for css in (guest, admin, both):
            self.assertFalse(re.search(r'--(bg|border|text|status|shadow)-', css), css)

    def test_every_value_is_a_plain_hex_or_rgb_triplet(self):
        for color in _grid()[::7]:
            css = bc.build_brand_css(color, color, 'all')
            for name, value in re.findall(r'(--[a-z0-9-]+):([^;]*);', css):
                self.assertTrue(HEX6.fullmatch(value) or re.fullmatch(r'\d{1,3} \d{1,3} \d{1,3}', value), f'{name}={value}')
            self.assertNotIn('<', css)
            self.assertNotIn('url(', css)

    def test_malicious_input_never_reaches_the_css(self):
        attacks = ["red;}</style><script>alert(1)</script>", "#fff;}body{display:none}", "#2F4836}html{background:url(//evil)}",
                   "expression(alert(1))", "\"><img src=x onerror=alert(1)>", "#2F4836\n</style>", "javascript:alert(1)",
                   "{}", "@import 'x'", None, 12345, ["#fff"], {"a": 1}]
        for attack in attacks:
            for css in (bc.build_brand_css(attack, attack, 'all'), bc.build_brand_css('#2F4836', attack, 'guest'),
                        bc.build_brand_css(attack, None, 'admin')):
                self.assertNotIn('<', css, repr(attack))
                self.assertNotIn('script', css.lower(), repr(attack))
                self.assertNotIn('evil', css, repr(attack))
                self.assertNotIn('display:none', css, repr(attack))
                self.assertNotIn('@import', css, repr(attack))
                self.assertNotIn('url(', css, repr(attack))
                self.assertEqual(css.count('{'), 2)
                self.assertEqual(css.count('}'), 2)

    def test_unknown_scope_falls_back_to_all(self):
        self.assertEqual(bc.build_brand_css('#8B1E3F', None, 'zzz'), bc.build_brand_css('#8B1E3F', None, 'all'))

    def test_css_size_is_small(self):
        self.assertLess(len(bc.build_brand_css('#8B1E3F', '#B45309', 'all')), 4200)
