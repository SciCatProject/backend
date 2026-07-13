import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OidcClientService } from "src/common/openid-client/openid-client.service";

interface RefreshEntry {
  intervalId: ReturnType<typeof setInterval>;
}

export interface TokenRefreshResult {
  idToken: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface SessionTokenStore {
  getTokens(): {
    refreshToken: string | undefined;
    accessToken: string | undefined;
  };
  setTokens(tokens: TokenRefreshResult): void;
}

@Injectable()
export class TokenRefreshService implements OnModuleDestroy {
  private activeRefreshes = new Map<string, RefreshEntry>();
  private readonly refreshIntervalMs: number;
  private readonly oidcEnabled: boolean;

  constructor(
    private configService: ConfigService,
    private oidcClientService: OidcClientService,
  ) {
    const oidcConfig = this.configService.get<{ issuer?: string }>("oidc");
    this.oidcEnabled = !!oidcConfig?.issuer;
    this.refreshIntervalMs =
      (this.configService.get<number>("jwt.expiresIn") ?? 3600) * 1000 * 0.75;
  }

  startSessionRefresh(
    sessionId: string,
    tokenStore: SessionTokenStore,
    onTokenRefreshed?: (accessToken: string) => Promise<void>,
  ): void {
    if (!this.oidcEnabled) return;

    this.stopSessionRefresh(sessionId);

    const { refreshToken } = tokenStore.getTokens();
    if (!refreshToken) return;

    const intervalId = setInterval(
      () => this.refreshSessionTokens(sessionId, tokenStore, onTokenRefreshed),
      this.refreshIntervalMs,
    );

    this.activeRefreshes.set(sessionId, { intervalId });
  }

  private async refreshSessionTokens(
    sessionId: string,
    tokenStore: SessionTokenStore,
    onTokenRefreshed?: (accessToken: string) => Promise<void>,
  ): Promise<void> {
    try {
      const { refreshToken } = tokenStore.getTokens();
      if (!refreshToken) {
        this.stopSessionRefresh(sessionId);
        return;
      }

      const refreshed = await this.oidcClientService.refreshToken(refreshToken);
      if (!refreshed.idToken) return;

      tokenStore.setTokens(refreshed);
      Logger.debug(`Refreshed OIDC tokens for session ${sessionId}`);

      if (onTokenRefreshed && refreshed.accessToken) {
        try {
          await onTokenRefreshed(refreshed.accessToken);
        } catch (error) {
          Logger.warn(
            `Post-refresh callback failed for session ${sessionId}: ${(error as Error).message}`,
          );
        }
      }
    } catch (error) {
      Logger.warn(
        `OIDC token refresh failed for session ${sessionId}: ${(error as Error).message}`,
      );
    }
  }

  stopSessionRefresh(sessionId: string): void {
    const entry = this.activeRefreshes.get(sessionId);
    if (entry) {
      clearInterval(entry.intervalId);
      this.activeRefreshes.delete(sessionId);
    }
  }

  onModuleDestroy(): void {
    for (const [, entry] of this.activeRefreshes) {
      clearInterval(entry.intervalId);
    }
    this.activeRefreshes.clear();
  }
}
