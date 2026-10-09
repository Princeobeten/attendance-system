import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const ATTENDANCE_STATUSES = ["present", "late"] as const;

const attendanceRecordSchema = new Schema({
  session: { type: Schema.Types.ObjectId, ref: "Session", required: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  // The UID actually presented, kept even if the card is later reassigned
  cardUid: { type: String, required: true },
  terminalId: { type: String, required: true },
  markedAt: { type: Date, required: true, default: Date.now },
  status: { type: String, enum: ATTENDANCE_STATUSES, required: true, default: "present" },
});

// The duplicate rule, enforced by the database itself: however two taps are
// timed, only one record per user per session can be stored.
attendanceRecordSchema.index(
  { session: 1, user: 1 },
  { unique: true, name: "one_mark_per_session" },
);

export type AttendanceRecordDoc = InferSchemaType<typeof attendanceRecordSchema>;

export const AttendanceRecord: Model<AttendanceRecordDoc> =
  models.AttendanceRecord ?? model("AttendanceRecord", attendanceRecordSchema);
