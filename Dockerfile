FROM node:14-alpine


# Set the working directory in the container to /app
WORKDIR /app

# Copy the package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the application dependencies inside the Docker image
RUN npm install --only=production

# Copy the rest of the application to the working directory
COPY . .

# Make the container's port 3000 available to the outside world
EXPOSE 3000

# Define the command to run the application
CMD [ "node", "index.js" ]
