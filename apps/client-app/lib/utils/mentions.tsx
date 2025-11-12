import Link from 'next/link';

interface MentionLinkProps {
  text: string;
  className?: string;
}

/**
 * Component that renders text with clickable @username mentions
 * @example
 * <MentionText text="Hello @john this is @jane!" />
 * // Renders: Hello <Link>@john</Link> this is <Link>@jane</Link>!
 */
export function MentionText({ text, className }: MentionLinkProps) {
  // Regex to match @username (alphanumeric, underscore, period)
  const mentionRegex = /@([\w.]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    const username = match[1];
    const matchIndex = match.index;

    // Add text before the mention
    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }

    // Add the mention as a link
    parts.push(
      <Link
        key={matchIndex}
        href={`/app/profile/${username}`}
        className="mention-link"
        onClick={(e) => e.stopPropagation()}
      >
        @{username}
      </Link>
    );

    lastIndex = matchIndex + match[0].length;
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
