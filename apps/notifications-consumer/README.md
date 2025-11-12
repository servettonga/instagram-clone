# Notifications Consumer

```txt

  NOTIFICATIONS-CONSUMER

  CONSUMER LAYER (consumers/)
  ├─ notification.consumer.ts
  │  Role: Message broker orchestration
  │  • Listens to RabbitMQ queue
  │  • Parses incoming messages
  │  • Orchestrates business logic
  │  • Handles RabbitMQ-specific concerns (ack/nack)
  │
  SERVICE LAYER (services/)
  ├─ notification.service.ts
  │  Role: Database operations (can be reused!)
  │  • CRUD operations for notifications
  │  • Database queries
  │  • Business logic (not tied to RabbitMQ)
  │
  ├─ email.service.ts
  │  Role: Email sending (can be reused!)
  │  • Send emails via SMTP
  │  • Generate HTML templates
  │  • Not tied to RabbitMQ at all
  │
  └─ rabbitmq.service.ts
     Role: Infrastructure (RabbitMQ connection)
     • Connection management
     • Channel setup
     • Low-level RabbitMQ operations

```

## Real-World Example

### User Likes a Post

```jsx
// 1. USER CLICKS LIKE BUTTON (client-app)
await fetch('/posts/123/like', { method: 'POST' })

// 2. CORE-SERVER CONTROLLER (core-server-app)
@Post(':id/like')
async likePost(@Param('id') postId, @CurrentUser() user) {
  // Save like to database
  await this.postsService.likePost(postId, user.id)

  // Get post author
  const post = await this.postsService.findOne(postId)

  // SEND NOTIFICATION via RabbitMQ
  await this.notificationProducer.notifyPostLike(
    postId,
    post.authorId,  // Who to notify
    user.id         // Who liked it
  )

  return { success: true }
}

// 3. PRODUCER PUBLISHES MESSAGE
class NotificationProducerService {
  async notifyPostLike(postId, authorId, likerId) {
    await this.rabbitMQService.publish(
      'notifications',
      'notification.created',
      {
        userId: authorId,
        type: 'POST_LIKE',
        title: 'New like on your post',
        message: `Someone liked your post`,
        entityType: 'post',
        entityId: postId,
        actorId: likerId,
        sendEmail: true
      }
    )
  }
}

// 4. MESSAGE SITS IN RABBITMQ QUEUE
// (Even if consumer is down, message is safe!)

// 5. CONSUMER PROCESSES MESSAGE (notifications-consumer)
class NotificationConsumer {
  private async handleNotification(payload) {
    // A. Save to database
    const notif = await this.notificationService.createNotification({
      userId: payload.userId,        // "user-123"
      type: 'POST_LIKE',
      title: 'New like on your post',
      message: 'Someone liked your post',
      entityId: payload.entityId,    // "post-456"
      actorId: payload.actorId,      // "user-789"
      isRead: false,
      emailSent: false
    })
    // Now in PostgreSQL!

    // B. Get user email
    const user = await this.notificationService.getUserWithProfile(
      payload.userId
    )

    // C. Send email
    await this.emailService.sendNotificationEmail(user, notif)
    // Email sent via SMTP!

    // D. Mark as sent
    await this.notificationService.markEmailSent(notif.id)

    // E. ACK message (RabbitMQ deletes it)
  }
}

// 6. USER RECEIVES EMAIL
// Subject: "New like on your post"
// Body: "Someone liked your post [View Notification]"
```

## How to Use

### Step 1: Import the Service

In any NestJS service where you want to send notifications:

```typescript
import { NotificationProducerService } from '../services/notification-producer.service';

@Injectable()
export class PostsService {
  constructor(
    private readonly notificationProducer: NotificationProducerService,
  ) {}
}
```

### Step 2: Register the Service

Add to your module:

```typescript
import { RabbitMQService } from './services/rabbitmq.service';
import { NotificationProducerService } from './services/notification-producer.service';

@Module({
  providers: [
    RabbitMQService,
    NotificationProducerService,
    // ... other services
  ],
})
export class AppModule {}
```

### Step 3: Send Notifications

Use the convenience methods:

```typescript
// When someone likes a post
await this.notificationProducer.notifyPostLike(
  postAuthor.userId,    // Who receives the notification
  post.id,              // Post ID
  currentUser.id,       // Who triggered it
  currentUser.username  // Actor's username
);

// When someone comments
await this.notificationProducer.notifyPostComment(
  postAuthor.userId,
  post.id,
  comment.id,
  currentUser.id,
  currentUser.username
);

// When someone requests to follow
await this.notificationProducer.notifyFollowRequest(
  targetUser.id,
  currentUser.id,
  currentUser.username
);
```

---

## Examples

### Example 1: Post Like Notification

```typescript
// In posts.service.ts
async likePost(postId: string, userId: string) {
  // 1. Save like to database
  const like = await this.prisma.postLike.create({
    data: { postId, userId },
  });

  // 2. Get post author
  const post = await this.prisma.post.findUnique({
    where: { id: postId },
    include: { author: true },
  });

  // 3. Get current user info
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  // 4. Send notification (async, doesn't block)
  if (post.authorId !== userId) { // Don't notify yourself
    await this.notificationProducer.notifyPostLike(
      post.authorId,
      postId,
      userId,
      user.profile.displayName || user.username,
    );
  }

  return like;
}
```

### Example 2: Comment Reply Notification

```typescript
// In comments.service.ts
async replyToComment(parentCommentId: string, content: string, userId: string) {
  // 1. Create reply
  const reply = await this.prisma.comment.create({
    data: {
      content,
      userId,
      parentId: parentCommentId,
    },
  });

  // 2. Get parent comment author
  const parentComment = await this.prisma.comment.findUnique({
    where: { id: parentCommentId },
  });

  // 3. Get current user
  const user = await this.getCurrentUser(userId);

  // 4. Notify parent comment author
  if (parentComment.userId !== userId) {
    await this.notificationProducer.notifyCommentReply(
      parentComment.userId,
      parentCommentId,
      reply.id,
      userId,
      user.username,
    );
  }

  return reply;
}
```

### Example 3: Follow Request (Private Profile)

```typescript
// In profiles.service.ts
async requestFollow(targetProfileId: string, requesterId: string) {
  // 1. Check if profile is private
  const targetProfile = await this.prisma.profile.findUnique({
    where: { id: targetProfileId },
  });

  if (!targetProfile.isPrivate) {
    // Public profile - follow immediately
    return this.followProfile(targetProfileId, requesterId);
  }

  // 2. Create follow request
  const followRequest = await this.prisma.profileFollow.create({
    data: {
      followerId: requesterId,
      followingId: targetProfileId,
      status: 'PENDING',
    },
  });

  // 3. Notify target user
  const requester = await this.getUser(requesterId);

  await this.notificationProducer.notifyFollowRequest(
    targetProfile.userId,
    requesterId,
    requester.username,
  );

  return followRequest;
}
```

### Example 4: Custom Notification

For cases not covered by convenience methods:

```typescript
await this.notificationProducer.sendNotification({
  userId: targetUserId,
  type: NotificationType.SYSTEM,
  title: 'Welcome to Innogram!',
  message: 'Thanks for joining our community',
  sendEmail: true,
  metadata: {
    welcomeBonus: 100,
  },
});
```

---

## Monitoring

### RabbitMQ Management UI

Access the web interface at: **<http://localhost:15672>**

- **Username**: `admin`
- **Password**: `rabbitmq_password`

**What to check**:

- **Queues**: Should see `notifications` queue
- **Messages**: How many messages are waiting/processing
- **Consumers**: Should see 1 active consumer
- **Message rates**: Publishing and delivery rates

### Application Logs

**Core Server** (Producer):

```
✓ Connected to RabbitMQ
✓ RabbitMQ channel ready
✓ RabbitMQ exchanges and queues configured
Notification queued for user abc-123, type: POST_LIKE
```

**Notifications Consumer**:

```
✓ Connected to database
✓ Connected to RabbitMQ
✓ Notification consumer started
Processing notification for user abc-123, type: POST_LIKE
Created notification def-456 for user abc-123
Email sent to user@example.com for notification def-456
Successfully processed notification def-456
```

### Database

Check notifications table:

```sql
-- See recent notifications
SELECT * FROM notifications
ORDER BY "createdAt" DESC
LIMIT 10;

-- Count by type
SELECT type, COUNT(*)
FROM notifications
GROUP BY type;

-- Check email sending status
SELECT
  COUNT(*) FILTER (WHERE "emailSent" = true) as emails_sent,
  COUNT(*) FILTER (WHERE "emailSent" = false) as emails_pending
FROM notifications;
```

---

## Troubleshooting

### Problem: Consumer not receiving messages

**Check**:

```bash
# 1. Is RabbitMQ running?
docker ps | grep rabbitmq

# 2. Check RabbitMQ logs
docker logs intern_project_rabbitmq_dev

# 3. Check consumer logs
# Should see "✓ Notification consumer started"
```

**Fix**:

```bash
# Restart RabbitMQ
docker restart intern_project_rabbitmq_dev

# Restart consumer
# Stop with Ctrl+C, then:
npm run notifications:dev
```

### Problem: Emails not sending

**Check**:

1. Email credentials correct in `.env`?
2. Gmail App Password (not regular password)?
3. Check consumer logs for email errors

**Test email configuration**:

```typescript
// Add to notifications-consumer/src/main.ts for testing
const emailService = app.get(EmailService);
await emailService.sendNotificationEmail(
  {
    email: 'your-email@gmail.com',
    username: 'test',
    profile: { displayName: 'Test User' }
  },
  {
    id: 'test',
    title: 'Test Notification',
    message: 'This is a test',
    type: 'SYSTEM',
  }
);
```

### Problem: Messages stuck in queue

**Cause**: Consumer crashed while processing

**Fix**:

```bash
# 1. Check RabbitMQ UI - see dead/unacked messages
# 2. Restart consumer to reprocess
npm run notifications:dev

# 3. If messages are malformed, purge queue:
# Go to RabbitMQ UI → Queues → notifications → Purge
```

### Problem: Too many duplicate notifications

**Cause**: Sending notification in wrong place (like in a loop)

**Fix**:

- Only send notifications at the business logic level
- Check for duplicates before sending
- Use transaction IDs to prevent double-processing

---

## Advanced Topics

### Scaling

Run multiple consumer instances:

```bash
# Terminal 1
npm run notifications:dev

# Terminal 2
cd apps/notifications-consumer && npm run dev

# Both will share the queue - auto load balancing!
```

### Dead Letter Queue (DLQ)

For production, add a DLQ for failed messages:

```typescript
await channel.assertQueue(RABBITMQ_QUEUES.NOTIFICATIONS, {
  durable: true,
  deadLetterExchange: 'notifications_dlx',
  deadLetterRoutingKey: 'notifications.dead',
});
```

### Rate Limiting

Prevent email spam:

```typescript
// In notification-producer.service.ts
private async canSendEmail(userId: string): Promise<boolean> {
  const recentEmails = await this.prisma.notification.count({
    where: {
      userId,
      emailSent: true,
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
    },
  });

  return recentEmails < 10; // Max 10 emails per hour
}
```
