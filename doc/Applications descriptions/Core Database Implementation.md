# Core Database Implementation

## Entities / Tables

**Innogram** is a Social Web. The main entities may be required to implement base functionality within application are in the following lists *(lists are not exhaustive, additional points may be added).*

### Main Entities

All the following entities are created within SQL relational database (PostgreSQL).

> ⚠️ Level of necessity determines the order of implementation:
>
> 1 - Implementation in first iteration (most important);
>
> 2 - Desirable minimum level of functionality (desired to be done as minimum with 1 level of necessity);
>
> 3 - Additional functionality (good to be implemented and practiced);
>
> 4 - Extra functionality (not required, but good to try).

| Entity Name           | Schema        | Purpose                                                                 | Necessity |
|-----------------------|---------------|-------------------------------------------------------------------------|-----------|
| User                  | auth          | Base entity connecting account authentication ways and profiles         | 1         |
| Account               | auth          | Stores user identities/providers/ways to authenticate user              | 1         |
| Profile               | main          | Represents the person behind a user account (UI data)                   | 1         |
| Post                  | main          | Stores data for posts (caption, title, metadata)                        | 1         |
| Comment               | main          | Stores data for comments (content, metadata)                            | 1         |
| Asset                 | main          | Stores assets (mime type, url, size, type, metadata)                    | 1         |
| Chat                  | main          | Stores chats (name, metadata, description)                              | 2         |
| Message               | main          | Stores messages (metadata, text content)                                | 2         |
| Notification          | notification  | Stores notifications (action type, entity type, id, content, metadata)  | 3         |
| Profile Configuration | main          | Stores feature flags for users (e.g., Simple User)                      | 3         |
| Audit Log             | main          | Stores audit logs (old/new entity version, type, metadata)              | 4         |

#### Relationships (Many-to-Many Entities)

| Entity Name                  | Table Name                        | Schema | Connection (First Entity) | Connection (Second Entity) |
|------------------------------|-----------------------------------|--------|---------------------------|----------------------------|
| PostAsset                    | posts_assets                      | main   | Post                      | Asset                      |
| ProfileFollow                | profiles_follows                   | main   | Profile                   | Profile                    |
| ChatParticipant              | chats_participants                | main   | Profile                   | Chat                       |
| MessageAsset                 | messages_assets                   | main   | Message                   | Asset                      |
| PostLike                     | posts_likes                       | main   | Post                      | Like                       |
| CommentLike                  | comments_likes                    | main   | Comment                   | Like                       |
| ProfileToProfileConfiguration| profiles_to_profiles_configurations| main   | Profile                   | Profile Configuration      |

### Tables Attributes

Here is the list of columns (fields) should be created within tables (entities).

*List can have additional fields or may not have some of fields based on your discussion with mentor.*

***List is not exhaustive.***

> ⚠️ Tables attributes are provided as SQL scripts for creating tables.
>
> **PAY ATTENTION: YOU MUST IMPLEMENT THESE TABLES WITH CODE FIRST APPROACH (THROUGH MIGRATION WITHIN YOUR ORM)**

#### Base Tables

- User

    ```sql
    CREATE TABLE users (
        id VARCHAR(36) PRIMARY KEY, -- ID generated in application code
        role VARCHAR(20) NOT NULL DEFAULT 'User', -- Enum values: 'User', 'Admin' (validated in code)
        disabled BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(36) REFERENCES users(id),
        updated_at TIMESTAMP NOT NULL,
        updated_by VARCHAR(36) REFERENCES users(id)
    );
    ```

- Account

    ```sql
    CREATE TABLE accounts (
        id VARCHAR(36) PRIMARY KEY, -- ID generated in application code
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        provider VARCHAR(20) NOT NULL DEFAULT 'local', -- Enum values: 'local', 'google', 'facebook', 'github', 'twitter' (validated in code)
        provider_id VARCHAR(255),
        last_login_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(36) NOT NULL REFERENCES users(id),
        updated_at TIMESTAMP NOT NULL,
        updated_by VARCHAR(36) REFERENCES users(id)
    );
    ```

- Profile

    ```sql
    CREATE TABLE profiles (
        id VARCHAR(36) PRIMARY KEY, -- ID generated in application code
        user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        username VARCHAR(50) NOT NULL UNIQUE,
        display_name VARCHAR(100) NOT NULL,
        birthday DATE NOT NULL,
        bio TEXT,
        avatar_url VARCHAR(500),
        is_public BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(36) NOT NULL REFERENCES users(id),
        updated_at TIMESTAMP NOT NULL,
        updated_by VARCHAR(36) REFERENCES users(id),
        deleted BOOLEAN NOT NULL DEFAULT FALSE
    );
    ```

- Post

    ```sql
    CREATE TABLE posts (
        id VARCHAR(36) PRIMARY KEY, -- ID generated in application code
        profile_id VARCHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_archived BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(36) NOT NULL REFERENCES users(id),
        updated_at TIMESTAMP NOT NULL,
        updated_by VARCHAR(36) REFERENCES users(id),
    );
    ```

- Comment

    ```sql
    CREATE TABLE comments (
        id VARCHAR(36) PRIMARY KEY, -- ID generated in application code
        post_id VARCHAR(36) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        profile_id VARCHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        parent_comment_id VARCHAR(36) REFERENCES comments(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(36) NOT NULL REFERENCES users(id),
        updated_at TIMESTAMP NOT NULL,
        updated_by VARCHAR(36) REFERENCES users(id)
    );

    ```

- Asset

    ```sql
    CREATE TABLE assets (
        id VARCHAR(36) PRIMARY KEY, -- ID generated in application code
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        file_size INTEGER NOT NULL,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(36) NOT NULL REFERENCES users(id),
        updated_at TIMESTAMP NOT NULL,
        updated_by VARCHAR(36) REFERENCES users(id)
    );
    ```

- Chat

    ```sql
    CREATE TABLE chats (
        id VARCHAR(36) PRIMARY KEY, -- ID generated in application code
        name VARCHAR(100) NOT NULL,
        description TEXT,
        type VARCHAR(20) NOT NULL DEFAULT 'private', -- Enum values: 'private', 'group' (validated in code)
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(36) NOT NULL REFERENCES users(id),
        updated_at TIMESTAMP NOT NULL,
        updated_by VARCHAR(36) REFERENCES users(id),
    );
    ```

- Message

    ```sql
    CREATE TABLE messages (
        id VARCHAR(36) PRIMARY KEY, -- ID generated in application code
        chat_id VARCHAR(36) NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        profile_id VARCHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        reply_to_message_id VARCHAR(36) REFERENCES messages(id) ON DELETE SET NULL,
        is_edited BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(36) NOT NULL REFERENCES users(id),
        updated_at TIMESTAMP NOT NULL,
        updated_by VARCHAR(36) REFERENCES users(id),
        deleted BOOLEAN NOT NULL DEFAULT FALSE
    );
    ```

- Profile Configuration

    ```sql
    CREATE TABLE profile_configurations (
        id VARCHAR(36) PRIMARY KEY, -- ID generated in application code
        config_key VARCHAR(100) NOT NULL,
        is_admin_accessible_only BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(36) NOT NULL REFERENCES users(id),
        updated_at TIMESTAMP NOT NULL,
        updated_by VARCHAR(36) REFERENCES users(id)
    );
    ```

- Notification

    ```sql
    CREATE TABLE notifications (
        id VARCHAR(36) PRIMARY KEY, -- ID generated in application code
        type VARCHAR(20) NOT NULL, -- Enum values: 'like', 'comment', 'follow', 'subscription', 'system' (validated in code)
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSONB,
        is_read BOOLEAN NOT NULL DEFAULT false,
        read_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(36) NOT NULL REFERENCES users(id),
        updated_at TIMESTAMP NOT NULL,
        updated_by VARCHAR(36) REFERENCES users(id)
    );
    ```

- Audit Log

    ```sql
    CREATE TABLE audit_logs (
        id VARCHAR(36) PRIMARY KEY, -- ID generated in application code
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id VARCHAR(36) NOT NULL,
        old_values JSONB,
        new_values JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(36) NOT NULL REFERENCES users(id),
        updated_at TIMESTAMP NOT NULL,
        updated_by VARCHAR(36) REFERENCES users(id)
    );
    ```

#### Many-to-Many Tables

- PostAsset

    ```sql
    CREATE TABLE posts_assets (
        id VARCHAR(36) PRIMARY KEY, -- ID generated in application code
        post_id VARCHAR(36) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        asset_id VARCHAR(36) NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(36) NOT NULL REFERENCES users(id),
        updated_at TIMESTAMP NOT NULL,
        updated_by VARCHAR(36) REFERENCES users(id),
        UNIQUE(post_id, asset_id)
    );
    ```

- ProfileFollow

    ```sql
    CREATE TABLE profiles_follows (
        id VARCHAR(36) PRIMARY KEY, -- ID generated in application code
        follower_profile_id VARCHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        followed_profile_id VARCHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        accepted BOOLEAN,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(36) NOT NULL REFERENCES users(id),
        updated_at TIMESTAMP NOT NULL,
        updated_by VARCHAR(36) REFERENCES users(id),
        UNIQUE(follower_profile_id, followed_profile_id),
        CHECK(follower_profile_id != followed_profile_id)
    );
    ```

- ChatParticipant

    ```sql
    CREATE TABLE chats_participants (
        id VARCHAR(36) PRIMARY KEY, -- ID generated in application code
        profile_id VARCHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        chat_id VARCHAR(36) NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL DEFAULT 'member', -- Enum values: 'admin', 'member' (validated in code)
        joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        left_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(36) NOT NULL REFERENCES users(id),
        updated_at TIMESTAMP NOT NULL,
        updated_by VARCHAR(36) REFERENCES users(id),
        UNIQUE(profile_id, chat_id)
    );
    ```

- MessageAsset

    ```sql
    CREATE TABLE messages_assets (
        id VARCHAR(36) PRIMARY KEY, -- ID generated in application code
        message_id VARCHAR(36) NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        asset_id VARCHAR(36) NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(36) NOT NULL REFERENCES users(id),
        updated_at TIMESTAMP NOT NULL,
        updated_by VARCHAR(36) REFERENCES users(id),
        UNIQUE(message_id, asset_id)
    );
    ```

- PostLike

    ```sql
    CREATE TABLE posts_likes (
        id VARCHAR(36) PRIMARY KEY, -- ID generated in application code
        post_id VARCHAR(36) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        like_id VARCHAR(36) NOT NULL REFERENCES likes(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(36) NOT NULL REFERENCES users(id),
        updated_at TIMESTAMP NOT NULL,
        updated_by VARCHAR(36) REFERENCES users(id),
        UNIQUE(post_id, like_id)
    );
    ```

- CommentLike

    ```sql
    CREATE TABLE comments_likes (
        id VARCHAR(36) PRIMARY KEY, -- ID generated in application code
        comment_id VARCHAR(36) NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
        like_id VARCHAR(36) NOT NULL REFERENCES likes(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(36) NOT NULL REFERENCES users(id),
        updated_at TIMESTAMP NOT NULL,
        updated_by VARCHAR(36) REFERENCES users(id),
        UNIQUE(comment_id, like_id)
    );
    ```

- ProfileToProfileConfiguration

    ```sql
    CREATE TABLE profiles_to_profiles_configurations (
        id VARCHAR(36) PRIMARY KEY, -- ID generated in application code
        profile_id VARCHAR(36) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        profile_configuration_id VARCHAR(36) NOT NULL REFERENCES profiles_configurations(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(36) NOT NULL REFERENCES users(id),
        updated_at TIMESTAMP NOT NULL,
        updated_by VARCHAR(36) REFERENCES users(id),
        UNIQUE(profile_id, profile_configuration_id)
    );
    ```
