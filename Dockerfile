# Use the official Bun image as a base
FROM oven/bun:1.1.3-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and bun.lockb to leverage Docker cache
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the application source code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the app
CMD ["bun", "run", "dev", "--", "-H", "0.0.0.0"]