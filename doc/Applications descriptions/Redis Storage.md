# Redis Storage

Redis storage main purposes in this project are:

1. To store refresh tokens sessions:
    1. Key: `refresh_tokens:{refresh_token_id}`
    2. Values to store in JSON: `userId`, `ipAddress`, `userAgent`, `expiresAt`
2. To store blacklists of refresh and access tokens (Set :
    1. Refresh tokens:
        1. Key: `blacklist:refresh:{refresh_token_id}`

        ```bash
        # Set key "blacklist:access:abc-123" value "true" for 900 seconds (must be equal to amount of second left till the expire date)
        SETEX blacklist:refresh:abc-123 900 true
        ```

        ```bash
        # Check if key "blacklist:access:abc-123" exists. Returns 1 or 0. Can be used to check if key is still in blacklist
        EXISTS blacklist:access:abc-123
        ```

    2. Access tokens:

       1. Key: `blacklist:access:{access_token_jti}` or `blacklist:access:{access_token}`

      > ⚙️ Access token `jti` - is a unique identifier being put into payload of JWT token.
