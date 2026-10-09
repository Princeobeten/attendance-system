import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const CARD_STATUSES = ["active", "revoked", "lost"] as const;

const cardSchema = new Schema({
  // Unique identifier read from the NFC card, stored as uppercase hex
  cardUid: { type: String, required: true, trim: true, uppercase: true, maxlength: 32 },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  issuedAt: { type: Date, required: true, default: Date.now },
  revokedAt: { type: Date },
  status: { type: String, enum: CARD_STATUSES, required: true, default: "active" },
});

// A card UID can be active for only one user at a time. Revoked and lost
// cards stay in the collection so past attendance remains explicable.
cardSchema.index(
  { cardUid: 1 },
  { unique: true, partialFilterExpression: { status: "active" }, name: "one_active_card_per_uid" },
);
// A user holds at most one active card.
cardSchema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { status: "active" }, name: "one_active_card_per_user" },
);

export type CardDoc = InferSchemaType<typeof cardSchema>;

export const Card: Model<CardDoc> = models.Card ?? model("Card", cardSchema);
