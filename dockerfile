# Use the official Node.js 18-alpine image as the base image
FROM node:18-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Create a minimal image for production
FROM node:18-alpine AS runner

# Set the working directory
WORKDIR /app

# Copy the production build from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Set environment to production
ENV NODE_ENV production

# Expose the port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]
