import {
  AbilityBuilder,
  ExtractSubjectType,
  MongoAbility,
  createMongoAbility,
} from "@casl/ability";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AccessGroupsType } from "src/config/configuration";
import { Action } from "../action.enum";
import {
  Subjects,
  PossibleAbilities,
  Conditions,
} from "../types/casl-subjects";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { JobClass } from "src/jobs/schemas/job.schema";
import { JobConfigService } from "src/config/job-config/jobconfig.service";
import { CreateJobAuth, UpdateJobAuth } from "src/jobs/types/jobs-auth.enum";

@Injectable()
export class JobAbility {
  constructor(
    private configService: ConfigService,
    private jobConfigService: JobConfigService,
  ) {
    this.accessGroups =
      this.configService.get<AccessGroupsType>("accessGroups");
  }
  private accessGroups?: AccessGroupsType;

  buildAbility(
    user: JWTUser | null,
  ): MongoAbility<PossibleAbilities, Conditions> {
    const { can, cannot, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );
    const allJobConfigs = this.jobConfigService.allJobConfigs;

    /**
     * Unauthenticated user
     */
    Object.entries(allJobConfigs).forEach(([jobType, jobConfig]) => {
      const matchJobType = jobType ? { type: jobType } : {};

      if (
        jobConfig.create.auth === CreateJobAuth.All ||
        jobConfig.create.auth === CreateJobAuth.DatasetPublic
      ) {
        can(Action.JobCreate, JobClass, matchJobType);
      }

      if (jobConfig.update.auth === UpdateJobAuth.All) {
        can(Action.JobUpdate, JobClass, {
          ownerGroup: undefined,
          ...matchJobType,
        });
      }
    });

    if (!user) {
      return build({
        detectSubjectType: (item) =>
          item.constructor as ExtractSubjectType<Subjects>,
      });
    }

    /**
     * Authenticated user
     */
    Object.entries(allJobConfigs).forEach(([jobType, jobConfig]) => {
      const matchJobType = jobType ? { type: jobType } : {};
      const ifOwnerUser = { ownerUser: user.username };
      const ifOwnerGroup = { ownerGroup: { $in: user.currentGroups } };

      const createAuthorizationValues = [
        ...Object.values(CreateJobAuth).filter(
          (v) => String(v) !== "#jobAdmin",
        ),
        ...user.currentGroups.map((g) => "@" + g),
        user.username,
      ];
      const updateAuthorizationValues = [
        ...Object.values(UpdateJobAuth).filter(
          (v) => String(v) !== "#jobAdmin",
        ),
        ...user.currentGroups.map((g) => "@" + g),
        user.username,
      ];

      let updateScope;
      switch (jobConfig.update.auth) {
        case "#jobOwnerUser":
          updateScope = { ...ifOwnerUser, ...matchJobType };
          break;
        case "#jobOwnerGroup":
          updateScope = { ...ifOwnerGroup, ...matchJobType };
          break;
        default:
          updateScope = matchJobType;
          break;
      }

      if (createAuthorizationValues.some((a) => jobConfig.create.auth === a)) {
        can(Action.JobCreate, JobClass, matchJobType);
      }

      can(Action.JobRead, JobClass, { ...ifOwnerUser, ...matchJobType });
      can(Action.JobRead, JobClass, { ...ifOwnerGroup, ...matchJobType });

      if (updateAuthorizationValues.some((a) => jobConfig.update.auth === a)) {
        can(Action.JobUpdate, JobClass, updateScope);
      }
    });

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.createJobPrivileged.includes(g),
      )
    ) {
      /**
       * User belonging to CREATE_JOB_PRIVILEGED_GROUPS
       */
      can(Action.JobCreate, JobClass);
      can(Action.JobRead, JobClass);
    }

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.updateJobPrivileged.includes(g),
      )
    ) {
      /**
       * User belonging to UPDATE_JOB_PRIVILEGED_GROUPS
       */
      can(Action.JobRead, JobClass);
      can(Action.JobUpdate, JobClass);
    }

    if (user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))) {
      /**
       * User belonging to ADMIN_GROUPS
       */
      can(Action.JobCreate, JobClass);
      can(Action.JobRead, JobClass);
      can(Action.JobUpdate, JobClass);
    }

    if (
      user.currentGroups.some((g) => this.accessGroups?.deleteJob.includes(g))
    ) {
      /**
       * User belonging to DELETE_JOB_GROUPS
       */
      can(Action.JobDelete, JobClass);
    }

    /**
     * Exclusion rules
     */
    if (
      user.currentGroups.some(
        (g) =>
          this.accessGroups?.createJobPrivileged.includes(g) &&
          !this.accessGroups?.updateJobPrivileged.includes(g) &&
          !this.accessGroups?.admin.includes(g),
      )
    ) {
      /**
       * User belonging only to CREATE_JOB_PRIVILEGED_GROUPS
       */
      cannot(Action.JobUpdate, JobClass);
    }

    if (
      user.currentGroups.some(
        (g) =>
          !this.accessGroups?.createJobPrivileged.includes(g) &&
          this.accessGroups?.updateJobPrivileged.includes(g) &&
          !this.accessGroups?.admin.includes(g),
      )
    ) {
      /**
       * User belonging only to UPDATE_JOB_PRIVILEGED_GROUPS
       */
      cannot(Action.JobCreate, JobClass);
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
