FROM oven/bun:1.1.3-alpine

# Install dependencies
RUN apk add --no-cache nodejs npm git

# Set the working directory
WORKDIR /app

# Copy local files to the container
COPY . .

# Verify the presence of package.json
RUN if [ ! -f package.json ]; then echo "package.json not found"; exit 1; fi

# Print the contents of package.json for debugging
RUN cat package.json

# Install dependencies using bun
RUN bun install

# Disable Next.js telemetry
RUN bun next telemetry disable

# Set the default command
CMD ["bun", "dev"]
