def test_error_has_three_languages():
    from core.exceptions import DishUnavailable
    e = DishUnavailable()
    assert e.msg_uz and e.msg_ru and e.msg_en
