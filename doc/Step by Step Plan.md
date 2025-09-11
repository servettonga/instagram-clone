# Step by Step Plan

Before working on test project:

1. Create a EDM diagram of a database for your application and discuss it with your mentor.
2. Create a GitHub using your commercial company email and send your mentor the link for your GitHub.
3. After you will set up your project, give you mentor an invitation link to your private repository with your test project.

## Application Initialization (1 PR)

1. Setting up core server microservice with NestJS.
2. Setting up authentication microservice.
3. Setting up client application with ReactJS and Next.js.
4. Creating shareable packages folder within root repository.
5. Setting up GitHub repository within root application folder and applying .gitignore rules.

Preferable to use monorepos like NX or Turbo Monorepo (Turbo Monorepo is easily integrated with Next.js apps as both these two technologies are created by Vercel).

> It’s allowed and preferred to use one root `.env` file for all projects within monorepo.

## Main features setup (2 PR)

1. Setting up connection with database using ORM (Prisma, Sequelize, TypeORM, Micro-ORM, Objection.js).
2. Setting up Linter rules for the whole application and applying separate rules to core, auth microservices and client application.
3. Setting up migrations flow using chosen ORM, creating first main entity (usually User entity) within core microservice.
4. Setting up Swagger within core microservice.
5. Setting up validation pipe, applying class-validator and class-transformer.
6. Creating first module (Users module usually), including DTOs, controller, service classes.
7. Setting up Configuration Module to retrieve and manage environmental variables data.
8. Create Docker and docker-compose files to manage Core Microservice, Authentication Microservice, Client Application and Database containers.

> Additionally you can implement reusable Entity, Service and Controller implementations to extend classes later and not write repeatable code.
>
> If your computer doesn’t stand the load Docker applies with 4 containers working, create Database containers only. But anyway configuration for all Microservices must be introduced within comments in configuration files

## Setting up and testing authorization/authentication (3 PR)

1. Creating API within Express.js authentication microservice containing controller → service methods for verifying access token, refreshing tokens and logging out.
2. Creating authentication service, Guard within NestJS core server microservice using authentication microservice to verify access token:
    1. Authentication service within core microservice must have methods to verify access token, to refresh tokens and logout by accessing authentication microservice with HTTP (use axios NestJS module);
    2. Guard must be used to protect routes accessible only by authenticated users;
    3. Methods within authentication service from core microservice must manipulate response object to set up and clear cookies with access and refresh tokens.
3. Also, authentication controller with methods for logging out, refreshing tokens and getting current authenticated user by client using identification data from JWT token (ID, email or username) must be created.

    You can use Passport.js library for authentication strategy purposes. **Don’t forget ot use private key for access and refresh tokens generation.**

4. Create several Postman or Jest end-to-end tests to check whole authentication functionality.

## Creating main CRUDs (4 PR)

1. Create several modules for all required entities
    1. Must contain all required CRUDs operations separated into services and controllers, using these services, according to REST principles;
    2. Must contain DTOs for requests;
    3. Must contain types and interfaces for variables;
    4. All “magic” numbers and strings must be moved into const variables;
    5. Move all required values into ENVIRONMENTAL VARIABLES and provide them within code where it’s requires.
2. Create custom decorators to apply Swagger documentation basic decorators to controllers and classes, if required.
3. Enable CORS for both microservices.
4. Protect controller methods with Guards.

    > There is nothing wrong with moving a bit away from strictly using all REST principles, making your application RESTful with easily understood structure of code, controller method paths, reusing repository methods of different entities within modules not related to these entities to avoid circular dependencies, if it makes your code clearer and more understandable.

5. Review, revise and refactor your code, don’t be afraid to ask for tips from your mentor.
6. Write several API tests to test your application correctness.

## Maintaining client application (5 PR)

1. Set up querying client to easily reuse it within your application (ky, TanStack query).
2. Set up theming and global styles for Shadcn UI library.
3. Create required `.env` variables for client application.
4. Create main layout and basic app based routing system within client application.
5. Create required reusable hooks, notification system.
6. Create User Context Provider and required hooks to retrieve authenticated user information.
7. Protect authentication-required routes.
8. Create Sign Up and Sign In pages.
