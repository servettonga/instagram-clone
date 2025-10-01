# Sequences diagrams

## Email and password authentication flows

### Sign Up (SEQUENCE)

```mermaid
sequenceDiagram
    participant Browser as Client (Browser)

    box "Core Microservice (API Gateway)"
        participant CoreAuthController as Auth Controller
        participant CoreAuthService as Auth Service
    end

    box "Authentication Microservice"
        participant AuthController as Auth Controller
        participant AuthService as Auth Service
    end

    participant PostgreSQL_DB as PostgreSQL
    participant Redis_DB as Redis (Sessions)

    Note over Browser, Redis_DB: New User Sign Up with Email & Password

    Browser->>+CoreAuthController: 1. POST /auth/signup (with email, password, username, etc.)
    CoreAuthController->>+CoreAuthService: handleSignUp(signUpDto)
    CoreAuthService->>+AuthController: 2. POST /internal/auth/register (signUpDto)

    AuthController->>+AuthService: 3. registerUser(signUpDto)

    Note over AuthService, PostgreSQL_DB: Check if email and username are not already taken.
    AuthService->>+PostgreSQL_DB: 4. SELECT 1 FROM accounts WHERE email=...
    PostgreSQL_DB-->>-AuthService: Not Found

    Note right of AuthService: CRITICAL: Hash the password before saving!
    AuthService->>AuthService: 5. Hash password (bcrypt)

    Note over AuthService, PostgreSQL_DB: Create new user within a single DB transaction.
    AuthService->>+PostgreSQL_DB: 6. BEGIN TRANSACTION
    AuthService->>PostgreSQL_DB: 7. INSERT INTO users (...)
    AuthService->>PostgreSQL_DB: 8. INSERT INTO accounts (..., provider='local', password_hash)
    AuthService->>PostgreSQL_DB: 9. INSERT INTO profiles (...)
    AuthService->>+PostgreSQL_DB: 10. COMMIT
    PostgreSQL_DB-->>-AuthService: New user created (returns userId)

    Note right of AuthService: Generate the first pair of tokens for the new user.
    AuthService->>AuthService: 11. Generates internal Access & Refresh tokens

    AuthService->>+Redis_DB: 12. SET refresh_tokens:{refresh_token_id} {userId: "...", ...}
    Redis_DB-->>-AuthService: OK

    AuthService-->>-AuthController: Returns internal Access & Refresh Tokens
    AuthController-->>-CoreAuthService: 13. HTTP Response with tokens
    CoreAuthService-->>-CoreAuthController: Signup successful

    Note over CoreAuthController, Browser: The user is immediately logged in by receiving their first tokens.
    CoreAuthController-->>-Browser: 14. Response: 201 Created (and sets access & refresh token cookies)
```

### Sign In and Token Generation (SEQUENCE)

```mermaid
sequenceDiagram
    title Email & Password Login Flow (JWT-based)

    box "Client"
        participant Browser
    end

    box "Core Microservice (API Gateway)"
        participant CoreAuthController as "Auth Controller"
        participant CoreAuthService as "Auth Service"
    end

    box "Authentication Microservice"
        participant AuthController as "Auth Controller"
        participant AuthService as "Auth Service"
    end

    box "Databases"
        participant PostgreSQL_DB as "PostgreSQL (Users)"
        participant Redis_DB as "Redis (Sessions)"
    end

    Note over Browser, Redis_DB: User Login with Email and Password

    Browser->>+CoreAuthController: 1. POST /auth/login (body: {email, password})
    CoreAuthController->>+CoreAuthService: handleLogin(credentials)

    Note right of CoreAuthService: HTTP call to the Authentication Microservice
    CoreAuthService->>+AuthController: 2. POST /internal/auth/login (credentials)
    AuthController->>+AuthService: 3. authenticateUser(email, password)

    Note over AuthService, PostgreSQL_DB: Find user in the main database by email
    AuthService->>+PostgreSQL_DB: 4. SELECT * FROM users WHERE email=...
    PostgreSQL_DB-->>-AuthService: 5. Returns user record (with hashed_password)

    Note right of AuthService: Authentication successful! Generating tokens.
    AuthService->>AuthService: 6. Verify password_hash with provided password (e.g., bcrypt.compare)

    Note right of AuthService: Generate internal Access Token (JWT) and Refresh Token (Opaque String).
    AuthService->>AuthService: 7. Generates internal tokens

    Note right of AuthService: Store the new Refresh Token's ID in Redis for session control.
    AuthService->>+Redis_DB: 8. SET refresh_tokens:{refresh_token_id} {tokenId: "new_token_id", ...}
    Redis_DB-->>-AuthService: OK

    AuthService-->>-AuthController: 9. Returns internal Access & Refresh Tokens
    AuthController-->>-CoreAuthService: 10. HTTP Response with tokens
    CoreAuthService-->>-CoreAuthController: Login successful

    Note over CoreAuthController, Browser: Both tokens are sent to the client in secure, HttpOnly cookies.
    CoreAuthController-->>-Browser: 11. Response: 200 OK (and sets access & refresh token cookies)
```

### Successful Access Token Validation (SEQUENCE)

```mermaid
sequenceDiagram
    title Successful Access Token Validation

    box Client
        participant Client
    end

    box "Core Microservice (NestJS)"
        participant AccessGuard as "Access Guard"
        participant AuthServiceCore as "Auth Service"
        participant TargetController as "Target Controller"
    end

    box "Authentication Microservice (Express.js)"
        participant AuthControllerAuth as "Auth Controller"
        participant AuthServiceAuth as "Auth Service"
    end

    Client->>AccessGuard: 1. Request with Access Token
    activate AccessGuard

    AccessGuard->>AuthServiceCore: 2. Call method to validate token <br> (validateToken(accessToken))
    activate AuthServiceCore

    AuthServiceCore->>AuthControllerAuth: Send HTTP request to /internal/auth/validate
    activate AuthControllerAuth

    AuthControllerAuth->>AuthServiceAuth: 3. validateToken(access_token)
    activate AuthServiceAuth
    deactivate AuthServiceAuth

    AuthControllerAuth-->>AuthServiceCore: Return { isValid: true, tokenPayload }
    deactivate AuthControllerAuth

    AuthServiceCore-->>AccessGuard: Return validation result
    deactivate AuthServiceCore

    AccessGuard->>TargetController: 4. Forward valid request
    activate TargetController

    Note over TargetController: Further processing <br> (service, DB, etc.)...

    TargetController-->>Client: 5. Response
    deactivate TargetController
    deactivate AccessGuard
```

### Token expired > Unsuccessful Access Token Validation > Successful Token Refresh (SEQUENCE)

```mermaid
sequenceDiagram
    title Token Expired & Refresh Flow

    box "Client"
        participant Client
    end

    box "Core Microservice"
        participant AccessGuard
        participant CoreAuthController as "Auth Controller"
        participant CoreAuthService as "Auth Service"
        participant TargetController
    end

    box "Authentication Microservice"
        participant AuthAuthController as "Auth Controller"
        participant AuthAuthService as "Auth Service"
    end

    box "In-Memory DB"
        participant Redis
    end

    %% --- 1. Initial request fails due to expired token ---
    Client->>AccessGuard: 1. Request with Expired Access Token
    activate AccessGuard
    AccessGuard-->>Client: 2. Response: 401 Unauthorized
    deactivate AccessGuard

    %% --- 2. Client requests new tokens using Refresh Token ---
    Client->>CoreAuthController: 3. POST /auth/refresh (with Refresh Token in cookie)
    activate CoreAuthController
    CoreAuthController->>CoreAuthService: Call handleRefresh(refresh_token_id)
    activate CoreAuthService
    CoreAuthService->>AuthAuthController: POST /internal/auth/refresh (refresh_token_id)
    activate AuthAuthController
    AuthAuthController->>AuthAuthService: processRefreshToken(old_refresh_token_id)
    activate AuthAuthService

    Note over AuthAuthService, Redis: Check if a session for this Refresh Token ID exists and is active.
    AuthAuthService->>Redis: 1. GET user_session_by_token_id:{old_refresh_token_id}
    activate Redis
    Redis-->>AuthAuthService: Session Found
    deactivate Redis

    Note over AuthAuthService, Redis: (Optional) Extra check to ensure token is not in blacklist.
    AuthAuthService->>Redis: 2. SISMEMBER token_blacklist {old_refresh_token_id}
    activate Redis
    Redis-->>AuthAuthService: Not in blacklist
    deactivate Redis

    Note over AuthAuthService: Generate new Access & Refresh tokens.
    AuthAuthService->>AuthAuthService: Generate new tokens

    Note over AuthAuthService, Redis: Update the session in Redis with the ID of the NEW Refresh Token.
    AuthAuthService->>Redis: 3. SET refresh_tokens:{refresh_token_id} {tokenId: "new_token_id", ...}
    activate Redis
    Redis-->>AuthAuthService: OK
    deactivate Redis

    Note over AuthAuthService, Redis: Add the ID of the OLD Refresh Token to a blacklist for a short time.
    AuthAuthService->>Redis: 4. SADD token_blacklist {old_refresh_token_id} (with TTL)
    activate Redis
    Redis-->>AuthAuthService: OK
    deactivate Redis

    AuthAuthService-->>AuthAuthController: { newAccessToken,<br> newRefreshToken (new refresh_token_id) }
    deactivate AuthAuthService

    AuthAuthController-->>CoreAuthService: Return refresh result
    deactivate AuthAuthController
    CoreAuthService-->>CoreAuthController: Return refresh result
    deactivate CoreAuthService
    CoreAuthController-->>Client: 4. Response: New tokens in cookies
    deactivate CoreAuthController

    %% --- 3. Client successfully retries the original request ---
    Note over Client, Redis: Client retries the original request with the new Access Token
    Client->>AccessGuard: 5. Retry original request with NEW Access Token
    activate AccessGuard

    Note over AccessGuard: Validation now succeeds...

    AccessGuard->>TargetController: 6. Forward valid request
    activate TargetController

    TargetController-->>Client: 7. Response
    deactivate TargetController
    deactivate AccessGuard
```

### Token expired > Unsuccessful Access Token Validation > Unsuccessful Token Refresh (SEQUENCE)

```mermaid
sequenceDiagram
    title Failed Token Refresh & Logout

    box "Client"
        participant Client
    end

    box "Core Microservice"
        participant CoreAuthController as "Auth Controller"
        participant CoreAuthService as "Auth Service"
    end

    box "Authentication Microservice"
        participant AuthAuthController as "Auth Controller"
        participant AuthAuthService as "Auth Service"
    end

    box "In-Memory DB"
        participant Redis
    end

    %% --- 1. Client initiates token refresh ---
    Note over Client, Redis: Client received 401 and tries to refresh using an invalid Refresh Token.

    Client->>CoreAuthController: 1. POST /auth/refresh (with an invalid Refresh Token in cookie)
    activate CoreAuthController
    CoreAuthController->>CoreAuthService: Call handleRefresh(refresh_token_id)
    activate CoreAuthService
    CoreAuthService->>AuthAuthController: POST /internal/auth/refresh (refresh_token_id)
    activate AuthAuthController
    AuthAuthController->>AuthAuthService: processRefreshToken(invalid_refresh_token_id)
    activate AuthAuthService

    %% --- 2. Server fails to find the session and rejects the request ---
    Note over AuthAuthService, Redis: Attempting to find the session by the invalid Refresh Token's ID.
    AuthAuthService->>Redis: 2. GET refresh_tokens:{invalid_refresh_token_id}
    activate Redis
    Redis-->>AuthAuthService: 3. Session Not Found (returns null)
    deactivate Redis

    Note right of AuthAuthService: Token not found. Refresh is impossible.
    AuthAuthService-->>AuthAuthController: { error: 'Invalid Refresh Token' }
    deactivate AuthAuthService

    AuthAuthController-->>CoreAuthService: Return error
    deactivate AuthAuthController
    CoreAuthService-->>CoreAuthController: Return error
    deactivate CoreAuthService

    %% --- 3. Client is logged out ---
    Note over CoreAuthController, Client: The server sends an error and <br>a command to clear cookies, terminating the session.
    CoreAuthController-->>Client: 4. Response: 401 Unauthorized (and command to clear cookies)
    deactivate CoreAuthController

    Note over Client, Client: Upon receiving the error, the client deletes <br> the tokens and redirects the user to the login page.
```

### Logout (SEQUENCE)

```mermaid
sequenceDiagram
    title Logout Flow

    box "Client"
        participant Browser
    end

    box "Core Microservice (API Gateway)"
        participant CoreAuthController as "Auth Controller"
        participant CoreAuthService as "Auth Service"
    end

    box "Authentication Microservice"
        participant AuthController as "Auth Controller"
        participant AuthService as "Auth Service"
    end

    box "Database"
        participant Redis_DB as "Redis (Sessions & Blacklist)"
    end

    Note over Browser, Redis_DB: User Initiates Logout

    Browser->>+CoreAuthController: 1. POST /auth/logout (with Refresh Token in cookie)
    CoreAuthController->>+CoreAuthService: handleLogout(refresh_token_id)

    Note right of CoreAuthService: HTTP call to invalidate the session
    CoreAuthService->>+AuthController: 2. POST /internal/auth/logout (refresh_token_id)
    AuthController->>+AuthService: 3. handleLogout(refresh_token_id)

    Note over AuthService, Redis_DB: Find and DELETE the session in Redis by the Refresh Token's ID
    AuthService->>+Redis_DB: 4. DEL refresh_tokens:{refresh_token_id}
    Redis_DB-->>-AuthService: OK

    Note right of AuthService: (Optional) Add Access Token to a blacklist until it expires. <br> (Separate blacklist for access token with TTL until it expires. <br> Requires check when validating access_token)
    AuthService->>+Redis_DB: 5. SET blacklist:{access_token_jti} true (with TTL)
    Redis_DB-->>-AuthService: OK

    AuthService-->>-AuthController: 6. Session successfully invalidated
    AuthController-->>-CoreAuthService: 7. HTTP Response: 200 OK
    CoreAuthService-->>-CoreAuthController: Logout successful

    Note over CoreAuthController, Browser: Server sends a command to clear cookies, terminating the client-side session.
    CoreAuthController-->>-Browser: 8. Response: 200 OK (and command to clear access & refresh token cookies)
```

## OAuth 2.0 authentication/authorization flows

### First-Time User Login via OAuth 2.0 (SEQUENCE)

```mermaid
sequenceDiagram
    participant Browser as Client (Browser)
    participant OAuthProvider as OAuth Provider (e.g., Google)

    box "Core Microservice (API Gateway)"
        participant CoreAuthController as Auth Controller
        participant CoreAuthService as Auth Service
    end

    box "Authentication Microservice"
        participant AuthController as Auth Controller
        participant AuthService as Auth Service
    end

    participant PostgreSQL_DB as PostgreSQL
    participant Redis_DB as Redis (Sessions)

    Note over Browser, Redis_DB: First-Time User Login & Session Creation

    Browser->>+CoreAuthController: 1. GET /auth/login/[provider]
    CoreAuthController->>+CoreAuthService: handleOAuthInit()
    CoreAuthService->>+AuthController: 2. GET /internal/oauth/initiate
    AuthController-->>-CoreAuthService: HTTP Response with Google's URL
    CoreAuthService-->>-CoreAuthController: Returns Redirect URL
    CoreAuthController-->>-Browser: 3. Redirect to OAuth Provider

    Browser->>+OAuthProvider: 4. Authenticates and gives consent
    OAuthProvider-->>-Browser: 5. Redirect to callback with `code`

    Browser->>+CoreAuthController: 6. GET /auth/[provider]/callback?code=...
    CoreAuthController->>+CoreAuthService: handleOAuthCallback(code)
    CoreAuthService->>+AuthController: 7. POST /internal/auth/oauth/exchange-code

    Note right of AuthController: Fetch user profile from Google, then discard Google's tokens.
    AuthController->>+AuthService: exchangeCodeForTokens(code)
    AuthService->>+OAuthProvider: 8. Server-to-server call for tokens & profile
    OAuthProvider-->>-AuthService: Returns user profile (email, name, etc.)

    Note over AuthService, PostgreSQL_DB: Check if an account with this email already exists.
    AuthService->>+PostgreSQL_DB: 9. SELECT * FROM accounts WHERE email=...
    PostgreSQL_DB-->>-AuthService: Account not found

    Note over AuthService, PostgreSQL_DB: Create new user within a single DB transaction.
    AuthService->>+PostgreSQL_DB: 10. BEGIN TRANSACTION
    AuthService->>PostgreSQL_DB: 11. INSERT INTO users (id, role, ...)
    AuthService->>PostgreSQL_DB: 12. INSERT INTO accounts (id, user_id, email, provider, ...)
    AuthService->>PostgreSQL_DB: 13. INSERT INTO profiles (id, user_id, username, display_name, ...)
    AuthService->>+PostgreSQL_DB: 14. COMMIT
    PostgreSQL_DB-->>-AuthService: All records created (returns new userId)

    Note right of AuthService: Generate internal Access Token (JWT) and Refresh Token (Opaque String).
    AuthService->>AuthService: 15. Generates internal tokens

    Note right of AuthService: Store a unique ID for the new Refresh Token in Redis.
    AuthService->>+Redis_DB: 16. SET refresh_tokens:{refresh_token_id} {userId: "...", expires...}
    Redis_DB-->>-AuthService: OK

    AuthService-->>-AuthController: Returns internal Access & Refresh Tokens
    AuthController-->>-CoreAuthService: 17. HTTP Response with tokens
    CoreAuthService-->>-CoreAuthController: Callback successful

    Note over CoreAuthController, Browser: Both tokens are sent as secure, HttpOnly cookies.
    CoreAuthController-->>-Browser: 18. Sets two HttpOnly cookies (access_token & refresh_token)
```

### Existing User Login via OAuth 2.0 (SEQUENCE)

```mermaid
sequenceDiagram
    participant Browser as Client (Browser)
    participant OAuthProvider as OAuth Provider (e.g., Google)

    box "Core Microservice (API Gateway)"
        participant CoreAuthController as Auth Controller
        participant CoreAuthService as Auth Service
    end

    box "Authentication Microservice"
        participant AuthController as Auth Controller
        participant AuthService as Auth Service
    end

    participant PostgreSQL_DB as PostgreSQL
    participant Redis_DB as Redis (Sessions)

    Note over Browser, Redis_DB: Existing User Login

    Browser->>+CoreAuthController: 1. GET /login/[provider]
    CoreAuthController->>+CoreAuthService: handleOAuthInit()
    CoreAuthService->>+AuthController: 2. GET /internal/oauth/initiate
    AuthController-->>-CoreAuthService: HTTP Response with Google's URL
    CoreAuthService-->>-CoreAuthController: Returns Redirect URL
    CoreAuthController-->>-Browser: 3. Redirect to OAuth Provider

    Browser->>+OAuthProvider: 4. Authenticates and gives consent
    OAuthProvider-->>-Browser: 5. Redirect to callback with `code`

    Browser->>+CoreAuthController: 6. GET /auth/[provider]/callback?code=...
    CoreAuthController->>+CoreAuthService: handleOAuthCallback(code)
    CoreAuthService->>+AuthController: 7. POST /internal/oauth/exchange-code

    Note right of AuthController: Fetch user profile from Google, then discard Google's tokens.
    AuthController->>+AuthService: exchangeCodeAndGetUser(code)
    AuthService->>+OAuthProvider: 8. Server-to-server call for tokens & profile
    OAuthProvider-->>-AuthService: Returns user profile (email, name)

    Note over AuthService, PostgreSQL_DB: Check for an existing account by provider and email.
    AuthService->>+PostgreSQL_DB: 9. SELECT user_id FROM accounts WHERE email=... AND provider='google'
    PostgreSQL_DB-->>-AuthService: Account found (returns existing user_id)

    Note over AuthService, Redis_DB: User record already exists, skipping creation.

    Note right of AuthService: Generate internal Access Token (JWT) and Refresh Token (Opaque String).
    AuthService->>AuthService: 10. Generates internal tokens

    Note right of AuthService: Store a unique ID for the new Refresh Token in Redis.
    AuthService->>+Redis_DB: 11. SET refresh_tokens:{refresh_token_id} {userId: "...", expires...}
    Redis_DB-->>-AuthService: OK

    AuthService-->>-AuthController: Returns internal Access & Refresh Tokens
    AuthController-->>-CoreAuthService: 12. HTTP Response with tokens
    CoreAuthService-->>-CoreAuthController: Callback successful

    Note over CoreAuthController, Browser: Both tokens are sent as secure, HttpOnly cookies.
    CoreAuthController-->>-Browser: 13. Sets two HttpOnly cookies (access_token & refresh_token)
```

## Common flows

### Layered Architecture Interactions in MVC (SEQUENCE)

```mermaid
sequenceDiagram
    title Layered Architecture Interaction

    participant Client
    participant Controller
    participant Service
    participant Repository
    participant Database
    participant OtherMicroservice as "Other Microservice"

    Client->>Controller: 1. HTTP Request (e.g., GET /users/123)
    activate Controller

    Controller->>Service: 2. Call business logic method (e.g., getUserById(123))
    activate Service

    Service->>Repository: 3. Request data from database (e.g., findById(123))
    activate Repository

    Repository->>Database: 4. Execute query (e.g., SELECT * FROM users WHERE id = 123)
    activate Database
    Database-->>Repository: 5. Return raw data
    deactivate Database
    Repository-->>Service: 6. Return data as entity/model
    deactivate Repository

    Note over Service, OtherMicroservice: Service may also call another microservice
    Service->>OtherMicroservice: 7. API Call for additional data (e.g., GET /orders?userId=123)
    activate OtherMicroservice
    OtherMicroservice-->>Service: 8. Return response
    deactivate OtherMicroservice

    Note over Service: Process & combine data
    Service-->>Controller: 9. Return result (DTO)
    deactivate Service

    Controller-->>Client: 10. HTTP Response (e.g., 200 OK + JSON body)
    deactivate Controller
```
