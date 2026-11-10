module.exports = {
  apps: [
    {
      name: 'tourluk-api',
      cwd: 'D:/sales-zalo-project-docs/apps/api',
      script: 'dist/src/main.js',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
    },
    {
      name: 'tourluk-web',
      cwd: 'D:/sales-zalo-project-docs/apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
    },
  ],
};
