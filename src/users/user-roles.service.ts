import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { FilterQuery, Model } from "mongoose";
import { CreateUserRoleDto } from "./dto/create-user-role.dto";
import { UserRole, UserRoleDocument } from "./schemas/user-role.schema";

@Injectable()
export class UserRolesService {
  constructor(
    @InjectModel(UserRole.name) private userRoleModel: Model<UserRoleDocument>,
  ) {}

  async userRoleExists(
    filter: FilterQuery<UserRoleDocument>,
  ): Promise<boolean> {
    const userRole = await this.userRoleModel.exists(filter).exec();
    return userRole ? true : false;
  }

  async createUserRole(
    createUserRoleDto: CreateUserRoleDto,
  ): Promise<UserRole> {
    Logger.log(
      `Create user role mapping for userId: ${createUserRoleDto.userId} and name: ${createUserRoleDto.name}`,
      "UserRolesService",
    );

    const createdUserRole = new this.userRoleModel(createUserRoleDto);
    return createdUserRole.save();
  }

  async findOrCreateUserRole(
    createUserRoleDto: CreateUserRoleDto,
  ): Promise<UserRole | null> {
    const filter: FilterQuery<UserRoleDocument> = {
      $and: [
        { userId: createUserRoleDto.userId },
        { name: createUserRoleDto.name },
      ],
    };
    const userRoleExists = await this.userRoleExists(filter);

    if (userRoleExists) {
      return await this.findOne(filter);
    }

    return await this.createUserRole(createUserRoleDto);
  }

  async findOne(
    filter: FilterQuery<UserRoleDocument>,
  ): Promise<UserRole | null> {
    return this.userRoleModel.findOne(filter).exec();
  }

  async findAll(
    filter: FilterQuery<UserRoleDocument>,
  ): Promise<UserRole[] | null> {
    return this.userRoleModel.find(filter).exec();
  }
}
