module.exports = {
  apps: [
    {
      name: 'nexus-backend',
      script: 'npm',
      args: 'start',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        HOSTNAME: '0.0.0.0'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOSTNAME: '0.0.0.0',
        DATABASE_URL: 'postgresql://username:password@localhost:5432/nexus_production'
      },
      env_staging: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOSTNAME: '0.0.0.0',
        DATABASE_URL: 'postgresql://username:password@localhost:5432/nexus_staging'
      },
      env_testnet: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOSTNAME: '0.0.0.0',
        DATABASE_URL: 'postgresql://username:password@localhost:5432/nexus_testnet'
      },
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,
      min_uptime: '10s',
      max_restarts: 10,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      health_check_url: 'http://localhost:3001/health',
      health_check_grace_period: 3000
    }
  ],
  
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-production-server',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/nexus-backend.git',
      path: '/var/www/nexus-backend',
      'pre-deploy-local': '',
      'post-deploy': 'pnpm install && pnpm run build && pnpm run prisma:migrate:deploy && pm2 reload ecosystem.config.js --env production'
    },
    staging: {
      user: 'deploy',
      host: 'your-staging-server',
      ref: 'origin/develop',
      repo: 'git@github.com:yourusername/nexus-backend.git',
      path: '/var/www/nexus-backend-staging',
      'post-deploy': 'pnpm install && pnpm run build && pnpm run prisma:migrate:deploy && pm2 reload ecosystem.config.js --env staging'
    },
    testnet: {
      user: 'deploy',
      host: 'your-testnet-server',
      ref: 'origin/testnet',
      repo: 'git@github.com:yourusername/nexus-backend.git',
      path: '/var/www/nexus-backend-testnet',
      'post-deploy': 'pnpm install && pnpm run build && pnpm run prisma:migrate:deploy && pm2 reload ecosystem.config.js --env testnet'
    }
  }
};
