import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Module,
  NestInterceptor,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { from, map, mergeMap, Observable } from "rxjs";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { AccessGroupsType } from "src/config/configuration";
import { CustomEmailList } from "src/datasets/utils/email-list-validator.util";
import { UserIdentitiesService } from "src/users/user-identities.service";
import { UsersModule } from "src/users/users.module";

@Injectable()
class MaskSensitiveDataInterceptor implements NestInterceptor {
  adminGroups: string[] | undefined;

  constructor(
    private readonly configService: ConfigService,
    private userIdentitiesService: UserIdentitiesService,
  ) {
    this.adminGroups =
      this.configService.get<AccessGroupsType>("accessGroups")?.admin;
  }

  private _maskSensitiveData<T>(
    data: T,
    ownEmails: Set<string>,
    seen = new WeakSet(),
  ): T {
    if (seen.has(data as object)) return data;
    if (!this.isPlainObject(data) && !Array.isArray(data)) return data;
    seen.add(data as object);
    if (Array.isArray(data)) {
      let anyMasked = false;
      const maskedData = data.map((item) => {
        if (this.isToMaskEmail(item, ownEmails)) {
          anyMasked = true;
          return this.maskEmailValue(item, ownEmails);
        }
        return this._maskSensitiveData(item, ownEmails, seen);
      });
      if (anyMasked) {
        data.length = 0;
        data.push(...new Set(maskedData));
      }
      return data;
    }

    for (const [key, value] of Object.entries(data as object)) {
      if (this.isToMaskEmail(value, ownEmails)) {
        (data as Record<string, unknown>)[key] = this.maskEmailValue(
          value,
          ownEmails,
        );
        continue;
      }
      this._maskSensitiveData(value, ownEmails, seen);
    }
    return data;
  }

  private maskSensitiveData<T>(data: T, ownEmails: Set<string>) {
    try {
      return this._maskSensitiveData(data, ownEmails);
    } catch (err) {
      if (err instanceof RangeError && /call stack/i.test(err.message))
        console.error("Recursion error detected in maskSensitiveData:", err);
      return data;
    }
  }

  private isPlainObject<T>(input: T): boolean {
    return typeof input === "object" && input !== null;
  }

  private isToMaskEmail(value: string | unknown, ownEmails: Set<string>) {
    return (
      typeof value === "string" &&
      this.toMaskEmails(value, ownEmails).length > 0
    );
  }

  private toMaskEmails(value: string, ownEmails: Set<string>): string[] {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const foundEmails = value.match(emailRegex) || [];
    return foundEmails.filter(
      (email) => !ownEmails.has(email.toLowerCase().trim()),
    );
  }

  private maskValue(): string {
    return "*****";
  }

  private maskEmailValue(value: string, ownEmails: Set<string>): string {
    const toMaskEmails = this.toMaskEmails(value, ownEmails);
    return toMaskEmails.reduce(
      (maskedValue, email) => maskedValue.replace(email, this.maskValue()),
      value,
    );
  }

  private async getIdentityEmails(
    user: JWTUser | undefined,
  ): Promise<Set<string>> {
    const emails: Set<string> = new Set();
    if (!user?.email) return emails;
    emails.add(user.email);
    const userIdentity = await this.userIdentitiesService.findOne({
      userId: user._id,
    });
    if (userIdentity?.profile?.email) emails.add(userIdentity.profile.email);
    userIdentity?.profile.emails?.forEach((e) => emails.add(e.value));
    return emails;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (
      user?.currentGroups?.some((group: string) =>
        this.adminGroups?.includes(group),
      )
    )
      return next.handle();

    return from(this.getIdentityEmails(user)).pipe(
      mergeMap((emails) =>
        next.handle().pipe(map((data) => this.maskSensitiveData(data, emails))),
      ),
    );
  }
}

@Module({
  imports: [UsersModule],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: MaskSensitiveDataInterceptor },
    CustomEmailList,
  ],
})
export class MaskSensitiveDataInterceptorModule {}
