# Cloud Deployment Guide for QCX

This guide provides instructions for deploying the QCX stack (Next.js, PostgreSQL with pgvector/PostGIS, and Qdrant) to various cloud platforms.

## Infrastructure Overview

The application consists of:
1.  **QCX Web App**: Next.js application running on Bun.
2.  **PostgreSQL**: Database with `pgvector` and `PostGIS` extensions.
3.  **Qdrant**: High-performance vector database (optional, for advanced vector search).

---

## 1. Deploying with Docker Compose (VPS / EC2 / Compute Engine)

The easiest way to deploy the entire stack is using `docker-compose`.

1.  **Clone the repository** on your server.
2.  **Create a `.env` file** based on the environment variables in `docker-compose.yaml`.
3.  **Run the stack**:
    ```bash
    docker-compose up -d --build
    ```

---

## 2. Deploying to Render

Render is a great choice for managed services.

### PostgreSQL (Managed)
1.  Create a **New PostgreSQL** instance on Render.
2.  **Note**: Standard Render Postgres does not include `pgvector` or `PostGIS` by default on all plans. You may need to use a Docker-based Postgres on Render or ensure your plan supports these extensions.
3.  If using Render's managed Postgres, run the extensions command manually via a SQL client:
    ```sql
    CREATE EXTENSION IF NOT EXISTS postgis;
    CREATE EXTENSION IF NOT EXISTS vector;
    ```

### Web Service
1.  Create a **New Web Service** pointing to your repository.
2.  Select **Docker** as the runtime.
3.  Specify the **Dockerfile path** as `Dockerfile`.
4.  Add environment variables:
    *   `DATABASE_URL`: Your Render Postgres connection string.
    *   `EXECUTE_MIGRATIONS`: `true`
    *   `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`: Your Mapbox token.
    *   (Add other necessary API keys like Google, xAI, etc.)

### Qdrant (Optional)
1.  Create a **New Private Service** or **Web Service**.
2.  Select **Docker** as the runtime.
3.  Use the image: `qdrant/qdrant:latest`.
4.  Set `QDRANT_URL` in your Web Service to point to this service.

---

## 3. Deploying to Google Cloud (GCP)

### Cloud Run
1.  **Build and Push** the image to Google Artifact Registry:
    ```bash
    docker build -t gcr.io/YOUR_PROJECT/qcx .
    docker push gcr.io/YOUR_PROJECT/qcx
    ```
2.  **Deploy to Cloud Run**:
    ```bash
    gcloud run deploy qcx --image gcr.io/YOUR_PROJECT/qcx --platform managed
    ```

### Cloud SQL
1.  Create a **Cloud SQL for PostgreSQL** instance (version 15+).
2.  Cloud SQL supports both `pgvector` and `postgis`. Enable them via:
    ```sql
    CREATE EXTENSION IF NOT EXISTS postgis;
    CREATE EXTENSION IF NOT EXISTS vector;
    ```

---

## 4. Vector Database Options

QCX is configured to support two vector database options:

1.  **PostgreSQL (pgvector)**: Integrated into the main database. Best for smaller datasets and simplicity.
2.  **Qdrant**: Dedicated vector database. Recommended for large-scale production use cases requiring high performance and advanced filtering.

To use Qdrant, ensure the `QDRANT_URL` environment variable is set in your application environment.

---

## 5. Security Checklist

*   [ ] Change default passwords in `docker-compose.yaml`.
*   [ ] Use SSL for database connections in production (`ssl=true` in `DATABASE_URL`).
*   [ ] Set `NODE_ENV=production`.
*   [ ] Ensure all sensitive API keys are stored as secrets, not committed to code.
