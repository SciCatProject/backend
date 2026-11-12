import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import * as mongoose from "mongoose";

export type UserRoleDocument = UserRole & mongoose.Document;

@Schema({
  collection: "UserRole",
  toJSON: {
    getters: true,
  },
  timestamps: { createdAt: "created", updatedAt: "modified" },
})
export class UserRole {
  @ApiProperty()
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "User" })
  userId: string;

  @ApiProperty({ type: String, description: "Name of the local user role" })
  @Prop({ type: String, unique: true })
  name: string;

  @ApiProperty({
    type: Date,
    description:
      "The date when the local user role was created. This is handled automatically by mongoose",
  })
  @Prop({ type: Date })
  created: Date;

  @ApiProperty({
    type: Date,
    description:
      "The date when the local user role was last modified. This is handled automatically by mongoose",
  })
  @Prop({ type: Date })
  modified: Date;
}

export const UserRoleSchema = SchemaFactory.createForClass(UserRole);
