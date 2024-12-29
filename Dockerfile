FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json yarn.lock ./
RUN yarn install

# Copy all source
COPY . .

# Build Strapi
RUN yarn build

# Expose port
EXPOSE 1337

# Start Strapi
CMD ["yarn", "start"]
