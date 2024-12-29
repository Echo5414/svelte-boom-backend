FROM node:18-alpine
WORKDIR /app

# Copy package files and install
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest
COPY . .

# Build Strapi
RUN npm run build

EXPOSE 1337
CMD ["npm", "start"]
