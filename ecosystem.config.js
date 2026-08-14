module.exports = {
  apps: [
    {
      name: "agenda-api",
      script: "dist/main.js",
      cwd: "./apps/api",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3001
      }
    },
    {
      name: "agenda-web",
      script: "npm",
      args: "start",
      cwd: "./apps/web",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
