<<<<<<< HEAD
# 1. Base Image: Use an official Node.js image.
FROM node:18-alpine

# 2. Set Working Directory
WORKDIR /app

# 3. Copy package.json and package-lock.json
COPY package*.json ./

# 4. Install Dependencies
RUN npm install

# 5. Copy the rest of the application code
COPY . .

# 6. Build the Next.js application
RUN npm run build

# 7. Expose the port the app will run on
EXPOSE 9002

# 8. Command to run the application
CMD ["npm", "start"]
=======
FROM node:18-alpine

# Install dependencies for Prisma
RUN apk add --no-cache \
    openssl \
    python3 \
    make \
    g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3001

CMD ["npm", "start"]
>>>>>>> 9e1a155 (added the code)
