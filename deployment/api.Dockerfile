FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY 404-Gravity-Not-Found-integration/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt gunicorn==23.0.0
COPY 404-Gravity-Not-Found-integration/nasa_api ./nasa_api
COPY 404-Gravity-Not-Found-integration/manage.py ./
RUN mkdir -p static staticfiles
EXPOSE 8000
CMD ["gunicorn", "nasa_api.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120", "--access-logfile", "-"]
