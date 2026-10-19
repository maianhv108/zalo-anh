module.exports = {
  apps: [
    {
      name: 'sales-zalo-api',
      cwd: 'd:\\sales-zalo-project-docs\\apps\\api',
      script: 'dist/src/main.js',
      env: {
        PORT: 4000,
        NODE_ENV: 'production',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: 'sales-zalo-web',
      cwd: 'd:\\sales-zalo-project-docs\\apps\\web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      env: {
        PORT: 3000,
        NODE_ENV: 'production',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
