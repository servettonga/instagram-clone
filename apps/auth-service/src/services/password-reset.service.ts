import * as crypto from 'crypto';

interface ResetToken {
  token: string;
  identifier: string; // Can be email or username
  expiresAt: Date;
}

export class PasswordResetService {
  // In-memory storage for reset tokens (for development/testing)
  // In production, store these in Redis or database
  private resetTokens: Map<string, ResetToken> = new Map();

  /**
   * Generate a password reset token for an identifier (email or username)
   */
  generateResetToken(identifier: string): string {
    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');

    // Token expires in 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Store token
    this.resetTokens.set(token, {
      token,
      identifier,
      expiresAt,
    });

    // Clean up expired tokens periodically
    this.cleanupExpiredTokens();

    return token;
  }

  /**
   * Validate a reset token and return the identifier if valid
   */
  validateResetToken(token: string): string | null {
    const resetToken = this.resetTokens.get(token);

    if (!resetToken) {
      return null;
    }

    // Check if token is expired
    if (new Date() > resetToken.expiresAt) {
      this.resetTokens.delete(token);
      return null;
    }

    return resetToken.identifier;
  }

  /**
   * Consume/delete a reset token after use
   */
  consumeResetToken(token: string): void {
    this.resetTokens.delete(token);
  }

  /**
   * Clean up expired tokens
   */
  private cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [token, data] of this.resetTokens.entries()) {
      if (now > data.expiresAt) {
        this.resetTokens.delete(token);
      }
    }
  }
}
