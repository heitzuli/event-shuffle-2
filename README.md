# Event Management Application

This is a simple event management application built with Koa, TypeScript, and PostgreSQL. The application allows you to create and list events.

## Prerequisites

- Docker
- Docker Compose
- Node.js
- npm

## Getting Started

### Clone the repository

```sh
git clone https://github.com/yourusername/event-management-app.git
cd event-management-app
```

### Set up the environment

Create a `.env` file in the root directory and add the following environment variables:

```env
DATABASE_URL=postgresql://postgres:password@db:5432/mydatabase
```

### Build and run the application

Use Docker Compose to build and run the application:

```sh
docker-compose up --build
```

This will start the application on `http://localhost:3000`.

### API Endpoints

#### Create an Event

- **URL:** `/events`
- **Method:** `POST`
- **Content-Type:** `application/json`
- **Body:**
  ```json
  {
    "name": "Sample Event"
  }
  ```

#### List All Events

- **URL:** `/events`
- **Method:** `GET`

### Manual Tests

You can use JetBrains HTTP Client to test the API endpoints. Create a file named `manual-tests/insert-event.http` with the following content:

```http
### Insert a new event
POST http://localhost:3000/events
Content-Type: application/json

{
  "name": "Sample Event"
}
```

### Development

To start the application in development mode, run:

```sh
npm install
npm run dev
```

This will start the application with hot-reloading enabled.

### Build

To build the application, run:

```sh
npm run build
```

This will compile the TypeScript code to JavaScript and place it in the `dist` directory.

### Project Structure

- `src/`: Contains the source code
  - `database.ts`: Database service for interacting with PostgreSQL
  - `model.ts`: TypeScript interfaces for the data models
  - `server.ts`: Koa server setup and route definitions
- `manual-tests/`: HTTP request files for manual testing