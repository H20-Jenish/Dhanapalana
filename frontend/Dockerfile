# Dhanapālana Frontend Dockerfile
# React application container for personal finance dashboard
# Multi-stage build for optimized production deployment

# ==========================================
# Stage 1: Build the Optimized React App
# ==========================================
FROM node:18-alpine AS build

# Set working directory inside the container
WORKDIR /app

# Copy dependency manifests and install them
COPY package*.json ./
RUN npm install

# Copy all source code into the container
COPY . .

# Compile the application into a minified, production-ready static build
RUN npm run build


# ==========================================
# Stage 2: Serve the Production Build
# ==========================================
FROM node:18-alpine

# Set working directory for the final lightweight container
WORKDIR /app

# Install timezone database for runtime timezone consistency.
RUN apk update && apk add tzdata

# Install 'serve', a fast static file server designed for React single-page apps
RUN npm install -g serve

# Copy ONLY the optimized build artifacts from Stage 1, leaving behind the heavy source code
COPY --from=build /app/build ./build

# Maintain the exposed port to seamlessly connect with the master Nginx reverse proxy
EXPOSE 3000

# Execute the static server, routing all requests (-s) to the index.html on port 3000.
# Bind to 0.0.0.0 so nginx can reach the container over the Docker network.
CMD ["serve", "-s", "build", "-l", "tcp://0.0.0.0:3000"]