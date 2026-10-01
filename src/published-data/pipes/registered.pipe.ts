import { Inject, Injectable, PipeTransform, Scope } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { Request } from "express";
import { IPublishedDataFilters } from "../interfaces/published-data.interface";

function addRegisteredStatusToJson(
  filter: IPublishedDataFilters,
  isAuthenticated = false,
) {
  if (isAuthenticated) return filter;
  filter.where = {
    ...filter.where,
    status: "registered",
  };
  return filter;
}

@Injectable({ scope: Scope.REQUEST })
export class RegisteredFilterPipe implements PipeTransform<
  { filter?: IPublishedDataFilters },
  { filter?: IPublishedDataFilters }
> {
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  transform(value: { filter?: IPublishedDataFilters }) {
    const withRegistered = addRegisteredStatusToJson(
      value?.filter ?? {},
      this.request.isAuthenticated(),
    );
    return { ...value, filter: withRegistered };
  }
}

@Injectable({ scope: Scope.REQUEST })
export class RegisteredPipe implements PipeTransform<
  IPublishedDataFilters,
  IPublishedDataFilters
> {
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  transform(value: IPublishedDataFilters) {
    return addRegisteredStatusToJson(value, this.request.isAuthenticated());
  }
}

export class IdToDoiPipe implements PipeTransform<
  { id: string },
  { where: { doi: string } }
> {
  transform(value: { id: string }) {
    return { where: { doi: value.id } };
  }
}
