FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN python manage.py collectstatic --noinput || true
EXPOSE 8060 8061

# ASGI — Daphne (Channels WS support)
CMD ["daphne","-b","0.0.0.0","-p","8060","config.asgi:application"]
