# Dhanapālana Backend Dockerfile
# Node.js Express API server for personal finance management
# Includes PostgreSQL client tools for database operations

# Use Node.js 18 Alpine Linux for smaller image size
FROM node:18-alpine

# Install PostgreSQL client tools and timezone database.
# tzdata ensures named IANA timezones work reliably in containers.
RUN apk update && apk add postgresql-client tzdata

# Set working directory for application
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install Node.js dependencies
# --legacy-peer-deps flag handles peer dependency conflicts
RUN npm install --legacy-peer-deps

# Copy application source code
COPY . .

# Security hardening: Change ownership to non-root user
# Prevents running as root which is a security risk
RUN chown -R node:node /app
USER node

# Expose port 5000 for the Express server
EXPOSE 5000

# Start the application
CMD ["npm", "start"]