#!/bin/sh

# Ensure uploads directory exists with correct permissions
mkdir -p /app/public/uploads
chmod -R 777 /app/public/uploads
chmod -R 777 /app/public

# Start Strapi
npm start 