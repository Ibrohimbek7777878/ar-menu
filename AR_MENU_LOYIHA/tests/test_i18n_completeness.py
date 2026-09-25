import json, pathlib

BASE = pathlib.Path('static/i18n')


def flatten(d, prefix=''):
    out = {}
    for k, v in d.items():
        key = f'{prefix}.{k}' if prefix else k
        if isinstance(v, dict):
            out.update(flatten(v, key))
        else:
            out[key] = v
    return out


def _load(lang):
    return flatten(json.load(open(BASE / f'{lang}.json', encoding='utf-8')))


def test_all_langs_have_same_keys():
    uz, ru, en = _load('uz'), _load('ru'), _load('en')
    assert set(uz) == set(ru), f"RU yetishmayapti: {set(uz) - set(ru)}"
    assert set(uz) == set(en), f"EN yetishmayapti: {set(uz) - set(en)}"


def test_no_empty_translations():
    for lang in ('uz', 'ru', 'en'):
        empty = [k for k, v in _load(lang).items() if not str(v).strip()]
        assert not empty, f'{lang} bo\'sh: {empty}'


def test_placeholders_match():
    import re
    ph = lambda s: set(re.findall(r'\{(\w+)\}', str(s)))
    uz, ru, en = _load('uz'), _load('ru'), _load('en')
    for k in uz:
        assert ph(uz[k]) == ph(ru[k]) == ph(en[k]), f'O\'rinbosar farqi: {k}'
