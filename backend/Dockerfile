FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install dependencies in a separate layer so source-only changes reuse the cache.
COPY requirements.txt ./requirements.txt
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

COPY app ./app

# The app can fall back to this directory when Supabase Storage is unavailable.
RUN mkdir -p /app/uploads

EXPOSE 8000

# Container Apps ingress should target port 8000.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
