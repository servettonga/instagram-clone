# Database Diagram

```json
  // Use DBML to define your database structure
  // Docs: https://dbml.dbdiagram.io/docs

  // Users table for main user information
  Table users {
    id integer [primary key, increment]
    email varchar(255) [unique, not null]
    username varchar(50) [unique, not null]
    password_hash varchar(255)
    display_name varchar(100)
    bio text
    avatar_url varchar(500)
    is_blocked boolean [default: false]
    role user_role [default: 'user']
    created_at timestamp [default: `CURRENT_TIMESTAMP`]
    updated_at timestamp [default: `CURRENT_TIMESTAMP`]
  }

  // OAuth providers for Google/GitHub authentication
  // User can have multiple OAuth connections
  // -- When a user signs in with Google/GitHub:
  // -- 1. Check if they already have an account
  // -- 2. Link their OAuth identity to their existing account
  // -- 3. Prevent duplicate accounts for the same person
  Table oauth_providers {
    id integer [primary key, increment]
    user_id integer [ref: > users.id, not null] // Links to existing user
    provider oauth_provider [not null] // 'google' or 'github'
    provider_user_id varchar(255) [not null] // Their Google/GitHub ID
    created_at timestamp [default: `CURRENT_TIMESTAMP`]

    indexes {
      (provider, provider_user_id) [unique]
    }
  }

  // Posts table
  Table posts {
    id integer [primary key, increment]
    user_id integer [ref: > users.id, not null]
    content text [not null]
    image_urls json // Array of image URLs stored in MinIO
    is_deleted boolean [default: false]
    created_at timestamp [default: `CURRENT_TIMESTAMP`]
    updated_at timestamp [default: `CURRENT_TIMESTAMP`]

    indexes {
      user_id
      created_at
    }
  }

  // Likes table for posts
  Table likes {
    id integer [primary key, increment]
    user_id integer [ref: > users.id, not null]
    post_id integer [ref: > posts.id, not null]
    created_at timestamp [default: `CURRENT_TIMESTAMP`]

    indexes {
      (user_id, post_id) [unique]
      user_id
      post_id
    }
  }

  // Comments table for posts
  Table comments {
    id integer [primary key, increment]
    user_id integer [ref: > users.id, not null]
    post_id integer [ref: > posts.id, not null]
    content text [not null]
    parent_comment_id integer [ref: > comments.id]
    is_deleted boolean [default: false]
    created_at timestamp [default: `CURRENT_TIMESTAMP`]
    updated_at timestamp [default: `CURRENT_TIMESTAMP`]

    indexes {
      post_id
      user_id
      parent_comment_id
    }
  }

  // User follows/subscriptions
  Table follows {
    id integer [primary key, increment]
    follower_id integer [ref: > users.id, not null]
    following_id integer [ref: > users.id, not null]
    created_at timestamp [default: `CURRENT_TIMESTAMP`]

    indexes {
      (follower_id, following_id) [unique]
      follower_id
      following_id
    }
  }

  // Direct message conversations (Instagram-like)
  // Dedicated table for efficiency
  Table conversations {
    id integer [primary key, increment]
    user1_id integer [ref: > users.id, not null]
    user2_id integer [ref: > users.id, not null]
    last_message_id integer [ref: > messages.id]
    last_message_at timestamp
    created_at timestamp [default: `CURRENT_TIMESTAMP`]
    updated_at timestamp [default: `CURRENT_TIMESTAMP`]

    indexes {
      (user1_id, user2_id) [unique]
      user1_id
      user2_id
      last_message_at
    }
  }

  // Messages in conversations
  Table messages {
    id integer [primary key, increment]
    conversation_id integer [ref: > conversations.id, not null]
    sender_id integer [ref: > users.id, not null]
    receiver_id integer [ref: > users.id, not null]
    content text [not null]
    message_type message_type [default: 'text']
    file_url varchar(500)
    metadata jsonb  // For flexible data like image dimensions
    is_read boolean [default: false]
    is_deleted boolean [default: false]
    created_at timestamp [default: `CURRENT_TIMESTAMP`]
    updated_at timestamp [default: `CURRENT_TIMESTAMP`]

    indexes {
      conversation_id
      (conversation_id, created_at)  // For chat history pagination
      sender_id
      receiver_id
      is_read
    }
  }

  // Notifications table
  Table notifications {
    id integer [primary key, increment]
    user_id integer [ref: > users.id, not null]
    type notification_type [not null]
    message text [not null]
    related_user_id integer [ref: > users.id]
    related_post_id integer [ref: > posts.id]
    related_comment_id integer [ref: > comments.id]
    is_read boolean [default: false]
    is_email_sent boolean [default: false]
    created_at timestamp [default: `CURRENT_TIMESTAMP`]

    indexes {
      user_id
      created_at
      is_read
      type
    }
  }

  // Reports for content moderation
  Table reports {
    id integer [primary key, increment]
    reporter_id integer [ref: > users.id, not null]
    reported_user_id integer [ref: > users.id]
    reported_post_id integer [ref: > posts.id]
    reported_comment_id integer [ref: > comments.id]
    reason report_reason [not null]
    description text
    status report_status [default: 'pending']
    reviewed_by integer [ref: > users.id]
    reviewed_at timestamp
    created_at timestamp [default: `CURRENT_TIMESTAMP`]

    indexes {
      reporter_id
      status
      created_at
    }
  }

  // User sessions for caching and tracking
  Table user_sessions {
    id integer [primary key, increment]
    user_id integer [ref: > users.id, not null]
    session_token varchar(500) [not null] // JWT ID or session identifier
    refresh_token_hash varchar(500) // Hashed refresh token
    expires_at timestamp [not null]
    is_active boolean [default: true]
    ip_address varchar(45) // For security monitoring
    user_agent text // Device information
    device_fingerprint varchar(255) // Additional security
    last_activity timestamp // For cleanup and monitoring
    created_at timestamp [default: `CURRENT_TIMESTAMP`]

    indexes {
      user_id
      session_token [unique]
      expires_at
      is_active
    }
  }

  // App statistics for admin dashboard
  Table app_statistics {
    id integer [primary key, increment]
    date date [not null]
    active_users integer [default: 0]
    total_posts integer [default: 0]
    total_likes integer [default: 0]
    total_comments integer [default: 0]
    total_messages integer [default: 0]
    new_users integer [default: 0]
    created_at timestamp [default: `CURRENT_TIMESTAMP`]

    indexes {
      date [unique]
    }
  }

  // Enums
  Enum user_role {
    user
    admin
  }

  Enum oauth_provider {
    google
    github
  }

  Enum message_type {
    text
    image
    file
  }

  Enum notification_type {
    like
    comment
    follow
    message
  }

  Enum report_reason {
    spam
    harassment
    inappropriate_content
    fake_profile
    other
  }

  Enum report_status {
    pending
    reviewed
    resolved
    dismissed
  }
```
