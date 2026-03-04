import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Response } from "express";

@Injectable()
export class FastResponseInterceptor implements NestInterceptor {
  constructor(
    private readonly headers = { "Content-Type": "application/json" },
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const res = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        if (res.headersSent) return data;

        res.set(this.headers);
        res.send(JSON.stringify(data));
        return null;
      }),
    );
  }
}
