FROM node:20-alpine

WORKDIR /app

# Build arguments for NEXT_PUBLIC_* variables (baked in at build time)
ARG NEXT_PUBLIC_SITE_URL=https://db.vectabase.com
ARG NEXT_PUBLIC_API_URL=http://localhost:8000

# Set as environment variables for the build
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Install ALL dependencies (including devDependencies like TypeScript) for build
COPY package.json package-lock.json* ./
RUN npm ci --include=dev

# Copy the rest of the application code
COPY . .

# Build the Next.js application with the env vars baked in
RUN npm run build

# AFTER build, set NODE_ENV to production for runtime
ENV NODE_ENV=production

# Expose the listening port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]
