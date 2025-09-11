# Project Description

Create a back-end application for a social network, supporting key functions such as user management, posts, likes, comments, subscriptions, notifications,and real-time chat. The project will be built based on microservice architecture with a separate authentication service, ensuring flexibility, stability, and high performance.

## Functional Requirements

Users:

- Registration (name, email, phone, password)
- Authentication via Google and Github (OAuth2)
- Update, view, and delete profile
- Follow/unfollow other users
- View notifications for activities (follows, likes, comments)

Posts:

- Create, edit, delete posts
- Upload images to server using Multer and store them in MinIO
- Likes and comments on posts
- Pagination of the post list

Chat:

- Real-time implementation using websockets
- Send messages and store them in the database
- View message history

Notifications:

- Email notifications for subscriptions using Nodemailer
- Push notifications through Websockets for events (likes, comments)

Caching:

- Setup Redis for caching
- Authorization tokens
- Popular posts
- User sessions to improve performance

Message Queues:

- Use RabbitMQ or Kafka
- For processing notifications
- For event transmission between services (post creation, likes, comments, follows)

Admin Role:

- User management
- View the list of users
- Delete users (hard delete)
- Block/unblock users
- Content management
- View the list of posts
- Delete posts that violet rules
- Work with Reports
- Handle user or post complaints
- Admin panel:
  - Access app statistics: number of active users, posts, likes, comments
  - Access server metrics: performance, errors, resource usage

Monitoring and Logging:

- Integrate Prometheus for collecting metrics (request latency, database performance)
- Set up Grafana for visualizing metrics
- Log requests and errors

Microservice Architecture:

- Dedicated authentication service on ExpressJS (See [JWT authentication flow](https://obsidian-swift-569.notion.site/Secure-JWT-authentication-flow-description-2627e285e99c80ddb645d311e076dfad))
- Main app on NestJS
- Service interaction via REST and Websockets

Testing:

- Functional coverage with unit and integration tests
- User Jest for testing

Deployment:

- Setup CI/CD for automated testing, building, deploying
- Deploy the app on a cloud platform

## Technical Requirements

Development Process:

- GitHub Flow:
  - Main branches: main, dev
  - For new features, create a separate named after the task (e.g. feature/JIRA-123)
  - Pull requests with mandatory reviews and issue resolution

Architecture:

- Microservice architecture
- Use message queues (RabbitMQ, Kafka) for event exchange between services

Databases:

- PostgreSQL for structured data
- MongoDB for storing tokens and messages. Redis can be used instead

Caching:

- Redis for temporary storage of tokens, popular data, and session cache

Monitoring and Metrics:

- Prometheus for metrics collection
- Grafana for visualizing monitoring data

Development Tools:

- TypeScript for strict typing
- ESLint and Prettier for code quality maintenance

Containerization and Deployment:

- Docker for packing applications
- CI/CD for automating building, testing and deployment

Testing:

- User Jest for unit testing
- Integration test and API tests

Documentation:

- README for each service
- Swagger/OpenAPI for API documentation
