import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// A lecture or meeting. It fixes the terminal and the window in which a tap counts.
const sessionSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  courseCode: { type: String, trim: true, uppercase: true, maxlength: 20 },
  terminalId: { type: String, required: true, trim: true, uppercase: true, maxlength: 20 },
  opensAt: { type: Date, required: true },
  closesAt: { type: Date, required: true },
  // Taps this many minutes after opensAt are marked late; empty means never late
  lateAfterMinutes: { type: Number, min: 0 },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
});

sessionSchema.index({ terminalId: 1, opensAt: 1, closesAt: 1 });

export type SessionDoc = InferSchemaType<typeof sessionSchema>;

export const Session: Model<SessionDoc> = models.Session ?? model("Session", sessionSchema);
