# Docker & Cloud Build Quick Reference

## Local Development

### Build and Run with Docker Compose

```bash
# Production build
docker-compose up --build

# Development build with hot reload
docker-compose --profile dev up qcx-dev --build

# Run in background
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f qcx
```

### Build and Run with Docker

```bash
# Build the image
docker build -t qcx:latest .

# Run the container
docker run -p 3000:3000 --env-file .env.local qcx:latest

# Run in background
docker run -d -p 3000:3000 --name qcx --env-file .env.local qcx:latest

# View logs
docker logs -f qcx

# Stop and remove
docker stop qcx && docker rm qcx
```

### Development Commands

```bash
# Build only the deps stage (for testing)
docker build --target deps -t qcx:deps .

# Build only the builder stage
docker build --target builder -t qcx:builder .

# Build with no cache
docker build --no-cache -t qcx:latest .

# Inspect image size
docker images qcx

# Check running containers
docker ps

# Execute commands in running container
docker exec -it qcx sh
```

## Google Cloud Build

### Manual Builds

```bash
# Submit a build
gcloud builds submit --config cloudbuild.yaml .

# Submit with substitutions
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions=BRANCH_NAME=main,COMMIT_SHA=$(git rev-parse HEAD) \
  .

# Build and tag with custom name
gcloud builds submit \
  --tag gcr.io/$(gcloud config get-value project)/qcx:v1.0.0 \
  .
```

### Manage Builds

```bash
# List recent builds
gcloud builds list --limit=10

# View build details
gcloud builds describe <BUILD_ID>

# View build logs
gcloud builds log <BUILD_ID>

# Stream build logs in real-time
gcloud builds log <BUILD_ID> --stream

# Cancel a running build
gcloud builds cancel <BUILD_ID>
```

### Manage Images

```bash
# List images
gcloud container images list --repository=gcr.io/$(gcloud config get-value project)

# List tags for an image
gcloud container images list-tags gcr.io/$(gcloud config get-value project)/qcx

# Delete an image
gcloud container images delete gcr.io/$(gcloud config get-value project)/qcx:TAG

# Delete untagged images
gcloud container images list-tags gcr.io/$(gcloud config get-value project)/qcx \
  --filter='-tags:*' --format='get(digest)' --limit=999999 \
  | xargs -I {} gcloud container images delete "gcr.io/$(gcloud config get-value project)/qcx@{}" --quiet
```

### Build Triggers

```bash
# List triggers
gcloud builds triggers list

# Run a trigger manually
gcloud builds triggers run <TRIGGER_NAME> --branch=main

# Describe a trigger
gcloud builds triggers describe <TRIGGER_NAME>

# Delete a trigger
gcloud builds triggers delete <TRIGGER_NAME>
```

## Cloud Run Deployment

### Deploy

```bash
# Deploy from Container Registry
gcloud run deploy qcx \
  --image gcr.io/$(gcloud config get-value project)/qcx:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --memory 2Gi \
  --cpu 2

# Deploy with environment variables
gcloud run deploy qcx \
  --image gcr.io/$(gcloud config get-value project)/qcx:latest \
  --region us-central1 \
  --set-env-vars NODE_ENV=production,API_KEY=your-key

# Deploy with secrets from Secret Manager
gcloud run deploy qcx \
  --image gcr.io/$(gcloud config get-value project)/qcx:latest \
  --region us-central1 \
  --set-secrets API_KEY=qcx-api-key:latest
```

### Manage Services

```bash
# List services
gcloud run services list

# Describe a service
gcloud run services describe qcx --region us-central1

# View service URL
gcloud run services describe qcx --region us-central1 --format='value(status.url)'

# Update service configuration
gcloud run services update qcx --region us-central1 --memory 4Gi

# Delete a service
gcloud run services delete qcx --region us-central1
```

### View Logs

```bash
# View recent logs
gcloud run services logs read qcx --region us-central1 --limit=50

# Stream logs in real-time
gcloud run services logs tail qcx --region us-central1

# Filter logs by severity
gcloud run services logs read qcx --region us-central1 --log-filter='severity>=ERROR'
```

### Traffic Management

```bash
# Split traffic between revisions
gcloud run services update-traffic qcx \
  --region us-central1 \
  --to-revisions qcx-00001-abc=50,qcx-00002-def=50

# Route all traffic to latest revision
gcloud run services update-traffic qcx \
  --region us-central1 \
  --to-latest

# Rollback to previous revision
gcloud run services update-traffic qcx \
  --region us-central1 \
  --to-revisions qcx-00001-abc=100
```

## Debugging

### Local Debugging

```bash
# Build and run with verbose output
docker build --progress=plain -t qcx:debug .

# Run with interactive shell
docker run -it --entrypoint /bin/sh qcx:latest

# Check container health
docker inspect --format='{{json .State.Health}}' qcx

# View container resource usage
docker stats qcx
```

### Cloud Debugging

```bash
# View build configuration
gcloud builds describe <BUILD_ID> --format=json

# Check service account permissions
gcloud projects get-iam-policy $(gcloud config get-value project) \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:*@cloudbuild.gserviceaccount.com"

# Test health endpoint
curl https://your-service-url.run.app/api/health

# View Cloud Run revision details
gcloud run revisions describe <REVISION_NAME> --region us-central1
```

## Optimization

### Image Size Analysis

```bash
# Use dive to analyze image layers
docker run --rm -it \
  -v /var/run/docker.sock:/var/run/docker.sock \
  wagoodman/dive:latest qcx:latest

# Check layer sizes
docker history qcx:latest --human --format "table {{.CreatedBy}}\t{{.Size}}"
```

### Build Cache

```bash
# Prune build cache
docker builder prune

# Prune all unused images
docker image prune -a

# Clear everything (use with caution)
docker system prune -a --volumes
```

## Environment Variables

### Local Development

```bash
# Create .env.local file
cp .env.local.example .env.local

# Edit environment variables
nano .env.local

# Run with custom env file
docker run --env-file .env.production qcx:latest
```

### Cloud Run

```bash
# Set environment variable
gcloud run services update qcx \
  --region us-central1 \
  --set-env-vars KEY=VALUE

# Remove environment variable
gcloud run services update qcx \
  --region us-central1 \
  --remove-env-vars KEY

# Update from env file
gcloud run services update qcx \
  --region us-central1 \
  --env-vars-file .env.production
```

## Monitoring

### Cloud Monitoring

```bash
# Enable Cloud Monitoring API
gcloud services enable monitoring.googleapis.com

# Create uptime check
gcloud monitoring uptime-checks create https://your-service-url.run.app/api/health

# View metrics
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_count"'
```

## Tips & Best Practices

1. **Always use specific image tags** in production (e.g., commit SHA)
2. **Enable health checks** for all services
3. **Use secrets management** for sensitive data
4. **Implement proper logging** at application level
5. **Set resource limits** to control costs
6. **Use multi-stage builds** to reduce image size
7. **Leverage build caching** for faster builds
8. **Test locally** before deploying to cloud
9. **Monitor build and runtime metrics** regularly
10. **Implement rollback strategies** for failed deployments
