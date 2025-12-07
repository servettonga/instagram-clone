import Link from 'next/link';
import UserHoverCard from '@/components/ui/UserHoverCard';

interface RichTextProps {
  text: string;
  className?: string;
}

/**
 * Component that renders text with clickable @username mentions and #hashtags
 * @example
 * <MentionText text="Hello @john check out #birds!" />
 * // Renders: Hello <Link>@john</Link> check out <Link>#birds</Link>!
 */
export function MentionText({ text, className }: RichTextProps) {
  // Regex to match @username or #hashtag (alphanumeric, underscore)
  const mentionHashtagRegex = /(@[\w.]+|#[\w]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = mentionHashtagRegex.exec(text)) !== null) {
    const matchedText = match[0];
    const matchIndex = match.index;

    // Add text before the match
    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }

    // Check if it's a mention or hashtag
    if (matchedText.startsWith('@')) {
      const username = matchedText.substring(1);
      // Add the mention as a link to profile with hover card
      parts.push(
        <UserHoverCard key={`mention-${keyIndex++}`} username={username}>
          <Link
            href={`/app/profile/${username}`}
            className="mention-link"
            onClick={(e) => e.stopPropagation()}
          >
            {matchedText}
          </Link>
        </UserHoverCard>
      );
    } else if (matchedText.startsWith('#')) {
      const hashtag = matchedText.substring(1);
      // Add the hashtag as a link to search with posts tab
      parts.push(
        <Link
          key={`hashtag-${keyIndex++}`}
          href={`/app/search?q=${encodeURIComponent(hashtag)}&type=posts`}
          className="hashtag-link"
          onClick={(e) => e.stopPropagation()}
        >
          {matchedText}
        </Link>
      );
    }

    lastIndex = matchIndex + matchedText.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <span className={className}>{parts}</span>;
}

/**
 * Utility function to extract all mentioned usernames from text
 * @example
 * extractMentions("Hello @john and @jane!") // Returns: ["john", "jane"]
 */
export function extractMentions(text: string): string[] {
  const mentionRegex = /@([\w.]+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    if (match[1]) {
      mentions.push(match[1]);
    }
  }

  return mentions;
}
