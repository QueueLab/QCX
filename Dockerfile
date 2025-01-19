FROM oven/bun:1.1.3-alpine

# Install dependencies
RUN apk add --no-cache nodejs npm git

# Clone the repository
RUN git clone --depth=1 https://github.com/queuelab/MapGPT /app

# Set the working directory
WORKDIR /app/MapGPT

# Remove the .git directory
RUN rm -rf .git

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
