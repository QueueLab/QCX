# Google Cloud Build Setup Guide for QCX

This guide provides step-by-step instructions for setting up Google Cloud Build to automatically build and deploy the QCX application.

## Prerequisites

1. **Google Cloud Project**: You need an active Google Cloud project with billing enabled
2. **gcloud CLI**: Install and authenticate the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
3. **Required APIs**: Enable the following APIs in your project:
   - Cloud Build API
   - Container Registry API
   - Cloud Run API (if deploying to Cloud Run)

## Quick Setup

### 1. Enable Required APIs

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable run.googleapis.com
```

### 2. Configure Cloud Build Permissions

Grant Cloud Build the necessary permissions to deploy:

```bash
# Get your project number
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')

# Grant Cloud Run Admin role to Cloud Build service account
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

# Grant Service Account User role
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

### 3. Set Up Build Triggers

#### Option A: Manual Trigger Setup (via Console)

1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Click **"CREATE TRIGGER"**
3. Configure:
   - **Name**: `qcx-build-deploy`
   - **Event**: Push to a branch
   - **Source**: Connect your GitHub repository (QueueLab/QCX)
   - **Branch**: `^main$` (or your production branch)
   - **Configuration**: Cloud Build configuration file (yaml or json)
   - **Location**: `cloudbuild.yaml`
4. Click **"CREATE"**

#### Option B: Automated Trigger Setup (via CLI)

```bash
# Connect your GitHub repository first (follow the prompts)
gcloud builds triggers create github \
  --name="qcx-build-deploy" \
  --repo-name="QCX" \
  --repo-owner="QueueLab" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml"
```

### 4. Configure Environment Variables (Optional)

If your application requires environment variables, you can:

#### Option A: Use Secret Manager

```bash
# Create a secret
echo -n "your-secret-value" | gcloud secrets create qcx-api-key --data-file=-

# Grant Cloud Build access to the secret
gcloud secrets add-iam-policy-binding qcx-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Then update `cloudbuild.yaml` to include:

```yaml
availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/qcx-api-key/versions/latest
      env: 'API_KEY'
```

#### Option B: Use Cloud Run Environment Variables

Modify the Cloud Run deployment step in `cloudbuild.yaml` to include:

```yaml
--set-env-vars="API_KEY=your-value,ANOTHER_VAR=another-value"
```

Or use `--set-secrets` for Secret Manager integration:

```yaml
--set-secrets="API_KEY=qcx-api-key:latest"
```

### 5. Test the Build

Trigger a manual build to test your configuration:

```bash
gcloud builds submit --config cloudbuild.yaml .
```

## Docker Configuration Details

### Multi-Stage Build

The updated `Dockerfile` uses a **multi-stage build** approach with three stages:

1. **deps**: Installs dependencies
2. **builder**: Builds the Next.js application
3. **runner**: Creates a minimal production runtime image

**Benefits**:
- Smaller final image size (only production dependencies)
- Faster builds with layer caching
- Improved security (no build tools in production image)

### Key Improvements

- **Non-root user**: Runs as `nextjs` user (UID 1001) for security
- **Health checks**: Built-in health check endpoint for container orchestration
- **Standalone output**: Next.js standalone mode reduces image size by ~80%
- **Tini init system**: Proper signal handling for graceful shutdowns
- **Production optimizations**: Telemetry disabled, optimized environment variables

### .dockerignore

The `.dockerignore` file excludes unnecessary files from the build context:
- Development dependencies and test files
- Documentation and IDE configurations
- Git history and CI/CD files
- Local environment files

This reduces build context size and speeds up builds.

## Cloud Build Configuration Details

### Build Steps

1. **Build Image**: Builds the Docker image with layer caching from the latest image
2. **Push Image**: Pushes the image to Google Container Registry with multiple tags
3. **Deploy** (optional): Deploys to Cloud Run automatically

### Caching Strategy

The configuration uses Docker layer caching to speed up builds:
- `--cache-from gcr.io/$PROJECT_ID/qcx:latest`: Pulls the latest image for cache
- `--build-arg BUILDKIT_INLINE_CACHE=1`: Enables inline cache metadata

### Image Tags

Three tags are created for each build:
- `$COMMIT_SHA`: Specific commit identifier (immutable)
- `latest`: Always points to the most recent build
- `$BRANCH_NAME`: Branch-specific tag (e.g., `main`, `develop`)

### Machine Type

Uses `E2_HIGHCPU_8` for faster builds. You can adjust this based on your needs:
- `E2_HIGHCPU_8`: 8 vCPUs, 8 GB RAM (recommended)
- `N1_HIGHCPU_8`: 8 vCPUs, 7.2 GB RAM (alternative)
- `E2_HIGHCPU_32`: 32 vCPUs, 32 GB RAM (for very large projects)

## Deployment Options

### Option 1: Google Cloud Run (Recommended)

Cloud Run is a fully managed serverless platform ideal for containerized applications.

**To enable automatic deployment**, uncomment the Cloud Run deployment step in `cloudbuild.yaml` and configure:

```yaml
- name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
  id: 'deploy-cloud-run'
  entrypoint: 'gcloud'
  args:
    - 'run'
    - 'deploy'
    - 'qcx'
    - '--image'
    - 'gcr.io/$PROJECT_ID/qcx:$COMMIT_SHA'
    - '--region'
    - 'us-central1'
    - '--platform'
    - 'managed'
    - '--allow-unauthenticated'  # Remove this for authenticated access
    - '--port'
    - '3000'
    - '--memory'
    - '2Gi'
    - '--cpu'
    - '2'
    - '--max-instances'
    - '10'
    - '--set-env-vars'
    - 'NODE_ENV=production'
```

### Option 2: Google Kubernetes Engine (GKE)

For more control and complex deployments, use GKE:

```bash
# Create a GKE cluster
gcloud container clusters create qcx-cluster \
  --num-nodes=3 \
  --machine-type=e2-standard-4 \
  --region=us-central1

# Deploy using kubectl
kubectl create deployment qcx --image=gcr.io/$PROJECT_ID/qcx:latest
kubectl expose deployment qcx --type=LoadBalancer --port=80 --target-port=3000
```

### Option 3: Compute Engine

Deploy to a VM instance:

```bash
# SSH into your instance
gcloud compute ssh your-instance-name

# Pull and run the container
docker pull gcr.io/$PROJECT_ID/qcx:latest
docker run -d -p 80:3000 --name qcx gcr.io/$PROJECT_ID/qcx:latest
```

## Monitoring and Logs

### View Build Logs

```bash
# List recent builds
gcloud builds list --limit=10

# View logs for a specific build
gcloud builds log <BUILD_ID>
```

### View Application Logs (Cloud Run)

```bash
gcloud run services logs read qcx --region=us-central1
```

### Set Up Monitoring

1. Go to [Cloud Monitoring](https://console.cloud.google.com/monitoring)
2. Create dashboards for:
   - Build success/failure rates
   - Container CPU and memory usage
   - Application response times
   - Error rates

## Cost Optimization

### Build Costs

- First 120 build-minutes per day are free
- After that: $0.003 per build-minute
- Use `E2_HIGHCPU_8` for a good balance of speed and cost

### Storage Costs

- Container Registry storage: $0.026 per GB per month
- Consider implementing image retention policies:

```bash
# Delete images older than 30 days
gcloud container images list-tags gcr.io/$PROJECT_ID/qcx \
  --format="get(digest)" \
  --filter="timestamp.datetime < $(date -d '30 days ago' --iso-8601)" \
  | xargs -I {} gcloud container images delete "gcr.io/$PROJECT_ID/qcx@{}" --quiet
```

### Cloud Run Costs

- Free tier: 2 million requests per month
- After that: $0.40 per million requests
- CPU: $0.00002400 per vCPU-second
- Memory: $0.00000250 per GiB-second

## Troubleshooting

### Build Fails with "Permission Denied"

Ensure Cloud Build service account has the necessary permissions:

```bash
gcloud projects get-iam-policy $(gcloud config get-value project) \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:*@cloudbuild.gserviceaccount.com"
```

### Image Not Found Error

Verify the image exists in Container Registry:

```bash
gcloud container images list --repository=gcr.io/$PROJECT_ID
```

### Slow Builds

1. Enable Docker layer caching (already configured)
2. Use a larger machine type in `cloudbuild.yaml`
3. Optimize your Dockerfile to reduce layer count
4. Use `.dockerignore` to exclude unnecessary files

### Health Check Failures

Create a health check endpoint in your Next.js app:

```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({ status: 'ok' }, { status: 200 });
}
```

## Next Steps

1. **Custom Domain**: Set up a custom domain for your Cloud Run service
2. **SSL/TLS**: Cloud Run provides automatic HTTPS
3. **CI/CD Pipeline**: Add testing steps before deployment
4. **Staging Environment**: Create separate triggers for staging and production
5. **Rollback Strategy**: Use specific commit SHA tags for easy rollbacks

## Additional Resources

- [Google Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- [Dockerfile Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## Support

For issues specific to:
- **QCX Application**: Open an issue on [GitHub](https://github.com/QueueLab/QCX)
- **Google Cloud**: Check [Cloud Build Status](https://status.cloud.google.com/)
- **Docker**: Consult [Docker Documentation](https://docs.docker.com/)
