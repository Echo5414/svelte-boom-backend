# Dockerfile
# New Test
# 12/30/2024

FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Make start script executable
COPY start.sh .
RUN chmod +x start.sh

RUN npm run build

EXPOSE 1337
CMD ["./start.sh"]

