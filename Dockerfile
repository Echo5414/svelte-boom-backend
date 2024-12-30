# Dockerfile
# New Test
# 12/30/2024

FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Create uploads directory and set permissions before build
RUN mkdir -p /app/public/uploads && \
    chmod -R 777 /app/public/uploads

RUN npm run build

EXPOSE 1337
CMD ["npm", "start"]

