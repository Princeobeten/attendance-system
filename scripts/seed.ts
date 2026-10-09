/**
 * Creates the first administrator, and optionally demonstration data.
 *
 *   npm run seed            first administrator only
 *   npm run seed -- --demo  also students, cards and two sessions
 *
 * ADMIN_IDENTIFIER and ADMIN_PASSWORD may be set in the environment;
 * otherwise ADMIN001 and a generated password are used.
 */
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { AttendanceRecord } from "../src/models/AttendanceRecord";
import { Card } from "../src/models/Card";
import { Session } from "../src/models/Session";
import { TapLog } from "../src/models/TapLog";
import { User } from "../src/models/User";

const DEMO_USERS = [
  ["Adaeze Okafor", "CSC/2021/001", "Computer Science", "04A1B2C3D4E501"],
  ["Babatunde Adeyemi", "CSC/2021/002", "Computer Science", "04A1B2C3D4E502"],
  ["Chiamaka Eze", "CSC/2021/003", "Computer Science", "04A1B2C3D4E503"],
  ["Daniel Musa", "CSC/2021/004", "Computer Science", "04A1B2C3D4E504"],
  ["Esther Ibrahim", "CSC/2021/005", "Computer Science", "04A1B2C3D4E505"],
  ["Femi Olawale", "CSC/2021/006", "Computer Science", "04A1B2C3D4E506"],
  ["Grace Nwosu", "CSC/2021/007", "Computer Science", "04A1B2C3D4E507"],
  ["Dr. Halima Bello", "STF/0042", "Computer Science", "04A1B2C3D4E508", "staff"],
] as const;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set. Run with --env-file=.env.local");
  await mongoose.connect(uri);
  await Promise.all([User, Card, Session, AttendanceRecord, TapLog].map((m) => (m as mongoose.Model<unknown>).init()));

  const identifier = (process.env.ADMIN_IDENTIFIER || "ADMIN001").toUpperCase();
  const existing = await User.findOne({ identifier });
  let admin = existing;
  if (existing) {
    console.log(`Administrator ${identifier} already exists; left unchanged.`);
  } else {
    const password = process.env.ADMIN_PASSWORD || randomBytes(9).toString("base64url");
    admin = await User.create({
      fullName: "System Administrator",
      identifier,
      department: "Registry",
      role: "administrator",
      passwordHash: await bcrypt.hash(password, 10),
    });
    console.log("Administrator created:");
    console.log(`  staff number: ${identifier}`);
    console.log(`  password:     ${process.env.ADMIN_PASSWORD ? "(from ADMIN_PASSWORD)" : password}`);
  }

  if (process.argv.includes("--demo")) {
    for (const [fullName, id, department, uid, role = "student"] of DEMO_USERS) {
      const user =
        (await User.findOne({ identifier: id })) ??
        (await User.create({ fullName, identifier: id, department, role }));
      const hasCard = await Card.exists({ user: user._id, status: "active" });
      if (!hasCard && !(await Card.exists({ cardUid: uid, status: "active" }))) {
        await Card.create({ cardUid: uid, user: user._id });
      }
    }

    const now = Date.now();
    const hour = 60 * 60 * 1000;
    const past = await Session.findOneAndUpdate(
      { title: "Data Structures (demo, yesterday)" },
      {
        title: "Data Structures (demo, yesterday)",
        courseCode: "CSC 301",
        terminalId: "LT-1",
        opensAt: new Date(now - 24 * hour),
        closesAt: new Date(now - 22 * hour),
        lateAfterMinutes: 15,
        createdBy: admin?._id,
      },
      { upsert: true, returnDocument: "after" },
    );
    const students = await User.find({ identifier: { $in: DEMO_USERS.slice(0, 5).map((u) => u[1]) } });
    for (const [i, s] of students.entries()) {
      const card = await Card.findOne({ user: s._id, status: "active" });
      await AttendanceRecord.updateOne(
        { session: past._id, user: s._id },
        {
          $setOnInsert: {
            cardUid: card?.cardUid ?? "UNKNOWN",
            terminalId: "LT-1",
            markedAt: new Date(past.opensAt.getTime() + (i === 4 ? 25 : 3 + i) * 60_000),
            status: i === 4 ? "late" : "present",
          },
        },
        { upsert: true },
      );
    }

    await Session.findOneAndUpdate(
      { title: "Data Structures (demo, now)" },
      {
        title: "Data Structures (demo, now)",
        courseCode: "CSC 301",
        terminalId: "LT-1",
        opensAt: new Date(now - 5 * 60_000),
        closesAt: new Date(now + 2 * hour),
        lateAfterMinutes: 15,
        createdBy: admin?._id,
      },
      { upsert: true },
    );

    console.log(`\nDemo data ready: ${DEMO_USERS.length} users with cards, sessions on terminal LT-1.`);
    console.log("Open /terminal, set terminal ID LT-1, and tap e.g. 04A1B2C3D4E501.");
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
