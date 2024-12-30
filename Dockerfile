# Dockerfile
# New Test
# 12/30/2024

FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Build first
RUN npm run build

# Set up permissions for all necessary directories and files
RUN mkdir -p /app/public/uploads && \
    chown -R node:node /app/public && \
    chown -R node:node /app/dist && \
    chown -R node:node /app/.env* && \
    chmod 644 /app/.env*

# Switch to non-root user
USER node

EXPOSE 1337
CMD ["npm", "run", "start"]

