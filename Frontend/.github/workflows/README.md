# GitHub Workflows - PM2 Deployment

This directory contains GitHub Actions workflows for automated CI/CD with PM2 deployment.

## CI/CD Pipeline Overview

The main workflow (`ci.yml`) provides a complete CI/CD pipeline that has been migrated from Docker to PM2:

### Workflow Structure

1. **Build Job** - Builds and tests the application
2. **Security Job** - Performs security analysis
3. **Deploy Job** - Deploys to production/staging using PM2

### Triggers

- **Push to `main`** - Triggers production deployment
- **Push to `develop`** - Triggers staging deployment
- **Pull Request to `main`** - Runs build and security checks only
- **Manual Dispatch** - Allows manual deployment to any environment

## Environment Configuration

### Required Secrets

Configure these secrets in your GitHub repository settings:

| Secret | Description | Required |
|--------|-------------|----------|
| `VPS_HOST` | Server IP address or hostname | Yes |
| `VPS_USER` | SSH username for server access | Yes |
| `SSH_PRIVATE_KEY` | SSH private key for server access | Yes |
| `GITHUB_TOKEN` | GitHub token (automatically provided) | No |

### Environment Files

Create these files in your repository root:

- `.env.production` - Production environment variables
- `.env.staging` - Staging environment variables

## Deployment Process

### Build Phase

1. **Setup Environment**
   - Installs Node.js 20 and pnpm
   - Caches dependencies for faster builds

2. **Quality Checks**
   - Runs spaghetti code detection
   - Performs dependency security audit
   - Checks Web3 dependency versions

3. **Build Application**
   - Builds Next.js application
   - Creates deployment artifact (tar.gz)
   - Uploads artifact for deployment

### Security Phase

1. **Dependency Audit**
   - Runs `pnpm audit` with moderate level
   - Counts and reports vulnerabilities
   - Generates security summary

2. **Code Analysis**
   - Runs GitHub CodeQL analysis
   - Uses security-extended and quality queries
   - Uploads results to GitHub Security tab

### Deployment Phase

1. **Preparation**
   - Downloads build artifact
   - Sets up deployment directory
   - Creates backup of existing deployment

2. **Server Setup**
   - Installs pnpm and PM2 (if not present)
   - Installs dependencies
   - Builds application on server

3. **PM2 Deployment**
   - Stops existing PM2 process
   - Starts new process with appropriate environment
   - Saves PM2 configuration

4. **Health Check**
   - Performs up to 10 health check attempts
   - Verifies application is responding on port 3000
   - Provides detailed logs if health check fails

5. **Cleanup**
   - Removes old backups (keeps last 3)
   - Reports final PM2 status

## PM2 Configuration

The workflow uses `ecosystem.config.js` for PM2 configuration:

- **Production**: Uses `env_production` settings
- **Staging**: Uses `env_staging` settings
- **Process Name**: `nexus-frontend`
- **Port**: 3000
- **Memory Limit**: 1G
- **Auto-restart**: Enabled

## Environment Variables

### Production Environment

```bash
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
NEXT_TELEMETRY_DISABLED=1
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_WEB3_NETWORK=mainnet
```

### Staging Environment

```bash
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
NEXT_TELEMETRY_DISABLED=1
NEXT_PUBLIC_API_URL=https://staging.yourdomain.com/api
NEXT_PUBLIC_APP_URL=https://staging.yourdomain.com
NEXT_PUBLIC_WEB3_NETWORK=devnet
```

## Monitoring and Logs

### PM2 Management

The deployment script includes PM2 status reporting and log management:

- **Status**: `pm2 status` - Shows running processes
- **Logs**: `pm2 logs nexus-frontend --lines 20` - Shows recent logs
- **Health Check**: Automated HTTP health check on port 3000

### Log Files

PM2 logs are stored in the `logs/` directory:

- `logs/combined.log` - All logs combined
- `logs/out.log` - Standard output
- `logs/error.log` - Error logs

## Troubleshooting

### Common Issues

1. **SSH Connection Failed**
   - Verify `VPS_HOST` and `VPS_USER` secrets
   - Check SSH key permissions
   - Ensure server is accessible

2. **Health Check Failed**
   - Check PM2 logs: `pm2 logs nexus-frontend`
   - Verify application built successfully
   - Check port 3000 availability

3. **Permission Errors**
   - Ensure VPS user has write permissions to deployment directory
   - Check Node.js and npm permissions

4. **Build Failures**
   - Review build logs in GitHub Actions
   - Check dependency compatibility
   - Verify environment variables

### Debugging Steps

1. **Check GitHub Actions Logs**
   - Review each step's output
   - Look for error messages
   - Check artifact upload/download

2. **Manual PM2 Commands**
   ```bash
   # SSH into server
   ssh user@server
   
   # Check PM2 status
   pm2 status
   
   # View logs
   pm2 logs nexus-frontend
   
   # Restart manually
   pm2 restart nexus-frontend
   ```

3. **Application Logs**
   ```bash
   # View application-specific logs
   tail -f /var/www/martech-production/logs/combined.log
   
   # Check Next.js build output
   ls -la /var/www/martech-production/.next
   ```

## Migration from Docker

### Key Changes

- **Container Removal**: No more Docker containers
- **Direct Deployment**: Files deployed directly to server
- **Process Management**: PM2 instead of Docker daemon
- **Artifact Size**: Smaller deployment packages
- **Startup Time**: Faster application startup

### Benefits

- **Lower Resource Usage**: No container overhead
- **Simpler Architecture**: Direct Node.js process management
- **Better Monitoring**: PM2 provides detailed Node.js metrics
- **Faster Deployments**: No container build/push steps

## Security Considerations

- **SSH Keys**: Use secure SSH key management
- **Environment Variables**: Store sensitive data in GitHub secrets
- **Dependency Scanning**: Automated vulnerability detection
- **CodeQL Analysis**: Static code security analysis
- **Access Control**: Limit GitHub Actions permissions

## Performance Optimization

- **Dependency Caching**: pnpm cache in GitHub Actions
- **Build Artifacts**: Reuse build artifacts across jobs
- **Parallel Jobs**: Build and security run in parallel
- **Incremental Builds**: Next.js incremental builds enabled
