import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { map, Observable } from "rxjs";
import { ProposalsService } from "src/proposals/proposals.service";
import { Logbook } from "../schemas/logbook.schema";

@Injectable()
export class UsersLogbooksInterceptor implements NestInterceptor {
  constructor(private readonly proposalsService: ProposalsService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<Logbook | Logbook[] | null>> {
    const usersGroups = context.getArgs()[1].req.user.currentGroups;
    const isAdmin = usersGroups.includes("admin");
    const proposals = await this.proposalsService.findAll({
      where: { ownerGroup: { $in: usersGroups } },
    });
    const proposalIds = proposals.map((proposal) => proposal.proposalId);

    return next.handle().pipe(
      map((payload: unknown) => {
        if (Array.isArray(payload)) {
          const filteredLogbook = (payload as Logbook[]).filter(
            (logbook) => proposalIds.includes(logbook?.name) || isAdmin,
          );
          return filteredLogbook;
        }

        return proposalIds.includes((payload as Logbook)?.name) || isAdmin
          ? (payload as Logbook)
          : null;
      }),
    );
  }
}
