import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const TAP_OUTCOMES = [
  "accepted",
  "no_session",
  "unrecognised",
  "suspended",
  "duplicate",
] as const;
export type TapOutcome = (typeof TAP_OUTCOMES)[number];

// Every tap is kept, refusals included, so impersonation attempts leave a trace.
const tapLogSchema = new Schema({
  cardUid: { type: String, required: true },
  terminalId: { type: String, required: true },
  outcome: { type: String, enum: TAP_OUTCOMES, required: true },
  message: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, ref: "User" },
  session: { type: Schema.Types.ObjectId, ref: "Session" },
  at: { type: Date, required: true, default: Date.now },
});

tapLogSchema.index({ at: -1 });

export type TapLogDoc = InferSchemaType<typeof tapLogSchema>;

export const TapLog: Model<TapLogDoc> = models.TapLog ?? model("TapLog", tapLogSchema);
