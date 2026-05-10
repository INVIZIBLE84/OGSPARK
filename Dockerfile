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
