.PHONY: run ws worker worker-model3d test lint migrate shell seed backup restore

Q ?= notify

run:
	python manage.py runserver 0.0.0.0:8060

ws:
	daphne -b 0.0.0.0 -p 8061 config.asgi:application

worker:
	python manage.py run_worker --queue=$(Q)

worker-model3d:
	python manage.py run_model3d_worker

test:
	pytest -x -q

test-cov:
	pytest --cov=apps --cov=core --cov-report=term-missing

lint:
	ruff check . && black --check .

fmt:
	ruff check --fix . && black .

migrate:
	python manage.py makemigrations && python manage.py migrate

shell:
	python manage.py shell

seed:
	python manage.py loaddata scripts/demo.json

backup:
	bash scripts/backup.sh

restore:
	bash scripts/restore.sh
