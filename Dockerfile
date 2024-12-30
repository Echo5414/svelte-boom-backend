# Dockerfile
# New Test
# 12/30/2024

FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN mkdir -p /app/public/uploads && \
    chown -R node:node /app/public

USER node

EXPOSE 1337
CMD ["npm", "run", "start"]

