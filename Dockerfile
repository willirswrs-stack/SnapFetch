# Use Node.js LTS as base
FROM node:20-slim

# Install system dependencies for FFmpeg and others
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (all of them for building)
RUN npm install --include=dev

# Copy project files
COPY . .

# Build frontend
RUN npm run build

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
