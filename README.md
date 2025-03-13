# Koa Server Project

## Description
This project is a simple Koa server that responds with "hello world" on an HTTP GET request to the URL `/hello`.

## Prerequisites
- Node.js (version 18 or later)
- npm (Node Package Manager)
- Docker (optional, for running the server in a Docker container)

## Installation
1. Clone the repository:
   ```sh
   git clone <repository-url>
   cd <repository-directory>
   ```

2. Install the dependencies:
   ```sh
   npm install
   ```

## Running the Server
### Development Mode
To run the server in development mode with TypeScript:
```sh
npm run dev
```
The server will be running on `http://localhost:3000`.

### Production Mode
To run the server in production mode:
1. Build the TypeScript code:
   ```sh
   npm run build
   ```

2. Start the server:
   ```sh
   npm start
   ```
The server will be running on `http://localhost:3000`.

## Running the Server in a Docker Container
1. Build the Docker image:
   ```sh
   docker build -t my-koa-server .
   ```

2. Run the Docker container:
   ```sh
   docker run -p 3000:3000 my-koa-server
   ```
The server will be running on `http://localhost:3000`.

## Endpoints
- `GET /hello`: Returns "hello world".

## .gitignore
The `.gitignore` file includes the following entries to exclude unnecessary files from the repository:
```
.idea
/dist/
/node_modules/
```