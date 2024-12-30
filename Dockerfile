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

# Then set up permissions
RUN mkdir -p /app/public/uploads && \
    chown -R node:node /app/public && \
    chown -R node:node /app/dist

# Switch to non-root user
USER node

EXPOSE 1337
CMD ["npm", "run", "start"]

