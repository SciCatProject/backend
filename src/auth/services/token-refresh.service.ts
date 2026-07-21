import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OidcClientService } from "src/common/openid-client/openid-client.service";

interface RefreshEntry {
  timeoutId: ReturnType<typeof setTimeout>;
  startedAt: number;
  sessionDurationMs: number;
}

export interface TokenRefreshResult {
  idToken: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface SessionTokenStore {
  getTokens(): {
    refreshToken: string | undefined;
    accessToken: string | undefined;
    expiresIn: number | undefined;
  };
  setTokens(tokens: TokenRefreshResult): void;
}

@Injectable()
export class TokenRefreshService implements OnModuleDestroy {
  private activeRefreshes = new Map<string, RefreshEntry>();
  private readonly defaultRefreshMs: number;
  private readonly oidcEnabled: boolean;

  constructor(
    private configService: ConfigService,
    private oidcClientService: OidcClientService,
  ) {
    const oidcConfig = this.configService.get<{
      issuer?: string;
      tokenRefreshEnabled?: boolean;
    }>("oidc");
    this.oidcEnabled =
      !!oidcConfig?.issuer && oidcConfig?.tokenRefreshEnabled !== false;
    this.defaultRefreshMs =
      (this.configService.get<number>("jwt.expiresIn") ?? 3600) * 1000 * 0.75;
  }

  startSessionRefresh(
    sessionId: string,
    tokenStore: SessionTokenStore,
    onTokenRefreshed?: (accessToken: string) => Promise<void>,
  ): void {
    if (!this.oidcEnabled) {
      Logger.debug(
        `OIDC token refresh not started for session ${sessionId}: OIDC is disabled`,
      );
      return;
    }

    this.stopSessionRefresh(sessionId);

    const { refreshToken } = tokenStore.getTokens();
    if (!refreshToken) {
      Logger.debug(
        `OIDC token refresh not started for session ${sessionId}: no refresh token available`,
      );
      return;
    }

    const sessionDurationMs =
      (this.configService.get<number>("jwt.expiresIn") ?? 3600) * 1000;

    this.activeRefreshes.set(sessionId, {
      timeoutId: undefined as unknown as ReturnType<typeof setTimeout>,
      startedAt: Date.now(),
      sessionDurationMs,
    });

    this.scheduleRefresh(sessionId, tokenStore, onTokenRefreshed);
  }

  private isSessionExpired(sessionId: string): boolean {
    const entry = this.activeRefreshes.get(sessionId);
    if (!entry) return true;
    return Date.now() - entry.startedAt >= entry.sessionDurationMs;
  }

  private scheduleRefresh(
    sessionId: string,
    tokenStore: SessionTokenStore,
    onTokenRefreshed?: (accessToken: string) => Promise<void>,
  ): void {
    if (this.isSessionExpired(sessionId)) {
      Logger.log(
        `Stopping OIDC token refresh for session ${sessionId}: session duration exceeded`,
      );
      this.stopSessionRefresh(sessionId);
      return;
    }

    const delay = this.delayForSession(tokenStore);
    const timeoutId = setTimeout(async () => {
      await this.refreshSessionTokens(sessionId, tokenStore, onTokenRefreshed);
    }, delay);

    const entry = this.activeRefreshes.get(sessionId);
    if (entry) {
      entry.timeoutId = timeoutId;
    }

    Logger.log(
      `Scheduled OIDC token refresh for session ${sessionId} in ${delay}ms`,
    );
  }

  private delayForSession(tokenStore: SessionTokenStore): number {
    const { expiresIn } = tokenStore.getTokens();
    if (expiresIn && expiresIn > 0) {
      const refreshBeforeMs =
        (this.configService.get<number>(
          "oidc.tokenRefreshSecondsBeforeExpiry",
        ) ?? 60) * 1000;
      const delay = Math.max(expiresIn * 1000 - refreshBeforeMs, 0);
      return delay;
    }
    return this.defaultRefreshMs;
  }

  private async refreshSessionTokens(
    sessionId: string,
    tokenStore: SessionTokenStore,
    onTokenRefreshed?: (accessToken: string) => Promise<void>,
  ): Promise<void> {
    try {
      const { refreshToken } = tokenStore.getTokens();
      if (!refreshToken) {
        Logger.debug(
          `Stopping OIDC token refresh for session ${sessionId}: refresh token no longer available`,
        );
        this.stopSessionRefresh(sessionId);
        return;
      }

      const refreshed = await this.oidcClientService.refreshToken(refreshToken);

      tokenStore.setTokens(refreshed);
      Logger.log(`Refreshed OIDC tokens for session ${sessionId}`);

      if (onTokenRefreshed && refreshed.accessToken) {
        try {
          await onTokenRefreshed(refreshed.accessToken);
        } catch (error) {
          Logger.warn(
            `Post-refresh callback failed for session ${sessionId}: ${(error as Error).message}`,
          );
        }
      }

      this.scheduleRefresh(sessionId, tokenStore, onTokenRefreshed);
    } catch (error) {
      Logger.warn(
        `OIDC token refresh failed for session ${sessionId}: ${(error as Error).message}`,
      );
      this.stopSessionRefresh(sessionId);
    }
  }

  stopSessionRefresh(sessionId: string): void {
    const entry = this.activeRefreshes.get(sessionId);
    if (entry) {
      clearTimeout(entry.timeoutId);
      this.activeRefreshes.delete(sessionId);
    }
  }

  onModuleDestroy(): void {
    for (const [, entry] of this.activeRefreshes) {
      clearTimeout(entry.timeoutId);
    }
    this.activeRefreshes.clear();
  }
}
