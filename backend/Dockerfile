# Restoran 3D menyu — production rasm (TZ: R9-2). Context: repo ildizi (docker compose `context: ..`).
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# curl — konteyner health-check uchun; kompilyator kerak emas (barcha paketlar tayyor g'ildirak sifatida o'rnatiladi).
# tesseract + poppler — menyu rasmidan/skanerlangan PDF'dan matn o'qish uchun lokal (internetsiz) zaxira usuli (o'zbek, rus, ingliz)
RUN apt-get update && apt-get install -y --no-install-recommends curl poppler-utils \
       tesseract-ocr tesseract-ocr-eng tesseract-ocr-rus tesseract-ocr-uzb \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install -r requirements.txt

COPY backend/ .

# Root'siz ishlaydi. Yoziladigan papkalar hajmlar (volume) sifatida ulanadi: media, statika, jurnal, kesh
RUN useradd --system --uid 10001 --create-home app \
    && mkdir -p /app/staticfiles /app/media /app/logs /app/cache \
    && chown -R app:app /app/staticfiles /app/media /app/logs /app/cache \
    && chmod +x /app/docker/entrypoint.sh
USER app

ENV LOG_DIR=/app/logs CACHE_DIR=/app/cache

EXPOSE 8000

# `web` yoki `worker` argumenti entrypoint'ga beriladi (docker-compose'da). collectstatic va migrate ishga tushganda
# haqiqiy muhit bilan bajariladi va xatoda konteyner to'xtaydi (avval build vaqtida `|| true` bilan yutilardi).
ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["web"]
