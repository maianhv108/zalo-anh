const path = require('path');

module.exports = {
  apps: [
    {
      name: 'sales-zalo-api',
      cwd: path.join(__dirname, 'apps', 'api'),
      script: 'dist/src/main.js',
      env: {
        PORT: 4000,
        NODE_ENV: 'production',
      },
      watch: false,
      autorestart: true,
      max_restarts: 15,
      restart_delay: 2000,
      max_memory_restart: '1G',
      error_file: path.join(__dirname, 'logs', 'api-error.log'),
      out_file: path.join(__dirname, 'logs', 'api-out.log'),
      time: true,
    },
    {
      name: 'sales-zalo-web',
      cwd: path.join(__dirname, 'apps', 'web'),
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      env: {
        PORT: 3000,
        NODE_ENV: 'production',
      },
      watch: false,
      autorestart: true,
      max_restarts: 15,
      restart_delay: 2000,
      max_memory_restart: '1G',
      error_file: path.join(__dirname, 'logs', 'web-error.log'),
      out_file: path.join(__dirname, 'logs', 'web-out.log'),
      time: true,
    },
  ],
};
