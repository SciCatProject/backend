import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { updateAllTimesToUTC } from "../utils";

@Injectable()
export class MultiUTCTimeInterceptor<T, U> implements NestInterceptor {
  subGroup: keyof T;
  dateKeys: (keyof U)[];

  constructor(subGroup: keyof T, dateKeys: (keyof U)[]) {
    this.subGroup = subGroup;
    this.dateKeys = dateKeys;
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> | Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest();
    const instances = req.body[this.subGroup] as U[];
    if (instances) {
      req.body[this.subGroup] = updateAllTimesToUTC<U>(
        this.dateKeys,
        instances,
      );
    }
    return next.handle();
  }
}
