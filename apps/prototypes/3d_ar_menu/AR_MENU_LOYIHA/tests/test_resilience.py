def test_circuit_opens_after_threshold():
    from django.core.cache import cache
    cache.clear()
    from core.resilience import CircuitBreaker
    cb = CircuitBreaker('t1', fail_threshold=3, timeout=60)
    for _ in range(3):
        cb.on_failure()
    assert cb.is_open()


def test_fallback_used_when_open():
    from django.core.cache import cache
    cache.clear()
    from core.resilience import CircuitBreaker
    cb = CircuitBreaker('t2', fail_threshold=1)
    cb.on_failure()
    assert cb.call(lambda: 1/0, fallback=lambda: 'fb') == 'fb'
