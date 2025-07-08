module.exports = {
  apps: [
    {
      name: 'student-profile-backend',
      script: 'backend/src/server.js',
      cwd: '/var/www/student-profile',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      // Logging
      log_file: '/var/log/pm2/student-profile-backend.log',
      out_file: '/var/log/pm2/student-profile-backend-out.log',
      error_file: '/var/log/pm2/student-profile-backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Process management
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git'],
      max_memory_restart: '500M',
      
      // Restart policy
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Environment variables from file
      env_file: '.env'
    }
  ],

  deploy: {
    production: {
      user: 'root',
      host: ['your-droplet-ip'],
      ref: 'origin/main',
      repo: 'https://github.com/Z0rlord/kinetic-school-app-z0rlord.git',
      path: '/var/www/student-profile',
      'pre-deploy-local': '',
      'post-deploy': 'cd backend && npm install && npm run db:migrate && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install -y git'
    }
  }
};
