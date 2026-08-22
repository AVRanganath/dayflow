import type { Role } from '@dayflow/shared';

export interface AuthUser {
  id: string;
  email: string;
  loginId?: string;
  role: Role;
  firstName?: string;
  lastName?: string;
  mustChangePassword?: boolean;
  avatarUrl?: string | null;
  department?: string | null;
  jobTitle?: string | null;
}

type AuthListener = (user: AuthUser | null) => void;

class AuthStore {
  private accessToken: string | null = null;
  private user: AuthUser | null = null;
  private listeners = new Set<AuthListener>();

  /**
   * Sets the active session (in memory only per ADR-007).
   */
  public setSession(token: string, user: AuthUser): void {
    this.accessToken = token;
    this.user = user;
    this.notify();
  }

  /**
   * Clears the in-memory session.
   */
  public clearSession(): void {
    this.accessToken = null;
    this.user = null;
    this.notify();
  }

  /**
   * Updates only user data while preserving current token.
   */
  public setUser(user: AuthUser | null): void {
    this.user = user;
    this.notify();
  }

  /**
   * Gets the current access token.
   */
  public getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Gets the current user.
   */
  public getUser(): AuthUser | null {
    return this.user;
  }

  /**
   * Checks if there is an active session in memory.
   */
  public isAuthenticated(): boolean {
    return Boolean(this.accessToken && this.user);
  }

  /**
   * Subscribes to auth state changes.
   */
  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.user);
    }
  }
}

export const authStore = new AuthStore();
