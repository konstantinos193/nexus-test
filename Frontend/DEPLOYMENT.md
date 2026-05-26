# PM2 Deployment Guide

This guide covers deploying the Nexus Frontend using PM2 instead of Docker.

## Prerequisites

- Node.js 20+ installed
- PM2 installed globally (`npm install -g pm2`)
- Server access with sufficient permissions

## Local Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## Production Deployment

### 1. Setup

```bash
# Install PM2 globally
npm install -g pm2

# Install project dependencies
pnpm install

# Build the application
pnpm build
```

### 2. Environment Configuration

Create environment files based on templates:

```bash
# Production
cp .env.production.template .env.production

# Staging
cp .env.staging.template .env.staging
```

### 3. Start the Application

#### Production
```bash
# Start with PM2
pnpm pm2:start:prod

# Or using PM2 directly
pm2 start ecosystem.config.js --env production
```

#### Staging
```bash
# Start with PM2
pnpm pm2:start:staging

# Or using PM2 directly
pm2 start ecosystem.config.js --env staging
```

### 4. PM2 Management Commands

```bash
# View application status
pnpm pm2:status

# View logs
pnpm pm2:logs

# Restart application
pnpm pm2:restart:prod    # Production
pnpm pm2:restart:staging # Staging

# Stop application
pnpm pm2:stop

# Delete application from PM2
pnpm pm2:delete

# Monitor with real-time dashboard
pnpm pm2:monit
```

### 5. Automatic Startup

To ensure PM2 starts automatically on server reboot:

```bash
# Generate startup script
pm2 startup

# Save current process list
pm2 save

# Example startup script output (run as root):
# [PM2] To setup the Startup Script, copy/paste the following command:
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u deploy --hp /home/deploy
```

## Environment Variables

### Production
- `NODE_ENV=production`
- `PORT=3000`
- `HOSTNAME=0.0.0.0`
- `NEXT_TELEMETRY_DISABLED=1`
- `NEXT_PUBLIC_API_URL=https://yourdomain.com/api`
- `NEXT_PUBLIC_APP_URL=https://yourdomain.com`
- `NEXT_PUBLIC_WEB3_NETWORK=mainnet`

### Staging
- `NODE_ENV=production`
- `PORT=3000`
- `HOSTNAME=0.0.0.0`
- `NEXT_TELEMETRY_DISABLED=1`
- `NEXT_PUBLIC_API_URL=https://staging.yourdomain.com/api`
- `NEXT_PUBLIC_APP_URL=https://staging.yourdomain.com`
- `NEXT_PUBLIC_WEB3_NETWORK=devnet`

## Monitoring and Logs

PM2 automatically manages logs in the `logs/` directory:

- `logs/combined.log` - All logs combined
- `logs/out.log` - Standard output
- `logs/error.log` - Error logs

### Log Rotation (Optional)

To enable log rotation:

```bash
# Install pm2-logrotate
pm2 install pm2-logrotate

# Configure (optional)
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

## Health Checks

PM2 includes built-in health checks:

- URL: `http://localhost:3000`
- Grace period: 3 seconds
- Automatic restart on failure

## Migration from Docker

### Key Differences

1. **Process Management**: PM2 manages Node.js processes directly vs Docker containers
2. **Port Binding**: Direct port binding (3000) vs Docker port mapping
3. **Resource Limits**: PM2 memory limits vs Docker resource constraints
4. **Environment Variables**: PM2 environment configuration vs Docker environment files

### Benefits of PM2

- Lower resource overhead
- Faster startup times
- Direct Node.js process management
- Built-in clustering support
- Zero-downtime reloads
- Better monitoring for Node.js applications

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Check what's using port 3000
   lsof -i :3000
   # or
   netstat -tulpn | grep :3000
   ```

2. **Build failures**
   ```bash
   # Clear build cache
   rm -rf .next
   pnpm build
   ```

3. **PM2 process not starting**
   ```bash
   # Check PM2 logs
   pm2 logs nexus-frontend
   
   # Check configuration
   pm2 show nexus-frontend
   ```

### Performance Optimization

1. **Enable clustering** (for multiple CPU cores):
   ```javascript
   // In ecosystem.config.js
   instances: 'max' // or specific number
   ```

2. **Memory monitoring**:
   ```bash
   pm2 monit
   ```

## Security Considerations

- Run PM2 as non-root user when possible
- Use environment variables for sensitive data
- Implement proper firewall rules for port 3000
- Regular security updates for Node.js and dependencies
