import "server-only";
import mongoose from "mongoose";
import { User } from "@/models/User";
import { Card } from "@/models/Card";
import { Session } from "@/models/Session";
import { AttendanceRecord } from "@/models/AttendanceRecord";
import { TapLog } from "@/models/TapLog";

type Cache = { promise: Promise<typeof mongoose> | null };

// Reuse one connection across hot reloads and requests.
const globalForDb = globalThis as unknown as { mongoose?: Cache };
const cache: Cache = globalForDb.mongoose ?? { promise: null };
globalForDb.mongoose = cache;

export async function connectDb() {
  if (!cache.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set");

    cache.promise = mongoose
      // IPv4 only: on networks without working IPv6, trying it first can
      // stall the first connection to Atlas for up to 30 seconds.
      .connect(uri, { bufferCommands: false, family: 4 })
      .then(async (m) => {
        // The rules that matter (one mark per user per session, one active
        // card per UID) live in unique indexes, so make sure they exist
        // before any request relies on them.
        await Promise.all(
          [User, Card, Session, AttendanceRecord, TapLog].map((model) =>
            (model as mongoose.Model<unknown>).init(),
          ),
        );
        return m;
      })
      .catch((err) => {
        cache.promise = null;
        throw err;
      });
  }
  return cache.promise;
}

export function isDuplicateKeyError(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === 11000
  );
}
