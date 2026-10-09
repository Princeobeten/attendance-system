import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const ROLES = ["student", "staff", "administrator"] as const;
export const USER_STATUSES = ["active", "suspended"] as const;

const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    // Matriculation or staff number
    identifier: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 30,
    },
    department: { type: String, required: true, trim: true, maxlength: 80 },
    role: { type: String, enum: ROLES, required: true, default: "student" },
    // bcrypt hash; set for administrators only
    passwordHash: { type: String, select: false },
    status: { type: String, enum: USER_STATUSES, required: true, default: "active" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User: Model<UserDoc> = models.User ?? model("User", userSchema);
