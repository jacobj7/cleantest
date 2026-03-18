import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uuid,
  index,
  uniqueIndex,
  foreignKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

// ─── Schema Definitions ───────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    name: text("name"),
    image: text("image"),
    hashedPassword: text("hashed_password"),
    role: text("role").notNull().default("user"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    emailUniqueIdx: uniqueIndex("users_email_unique_idx").on(table.email),
    createdAtIdx: index("users_created_at_idx").on(table.createdAt),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    sessionToken: text("session_token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    sessionTokenUniqueIdx: uniqueIndex("sessions_session_token_unique_idx").on(
      table.sessionToken,
    ),
    userIdIdx: index("sessions_user_id_idx").on(table.userId),
    expiresIdx: index("sessions_expires_idx").on(table.expires),
    userIdFk: foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "sessions_user_id_fk",
    }).onDelete("cascade"),
  }),
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    providerUniqueIdx: uniqueIndex("accounts_provider_unique_idx").on(
      table.provider,
      table.providerAccountId,
    ),
    userIdIdx: index("accounts_user_id_idx").on(table.userId),
    userIdFk: foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "accounts_user_id_fk",
    }).onDelete("cascade"),
  }),
);

export const generations = pgTable(
  "generations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    prompt: text("prompt").notNull(),
    negativePrompt: text("negative_prompt"),
    model: text("model").notNull(),
    width: integer("width").notNull().default(512),
    height: integer("height").notNull().default(512),
    steps: integer("steps").notNull().default(20),
    guidanceScale: integer("guidance_scale").notNull().default(7),
    seed: text("seed"),
    status: text("status").notNull().default("pending"),
    imageUrl: text("image_url"),
    thumbnailUrl: text("thumbnail_url"),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata"),
    isPublic: boolean("is_public").notNull().default(false),
    isFavorite: boolean("is_favorite").notNull().default(false),
    generationTimeMs: integer("generation_time_ms"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index("generations_user_id_idx").on(table.userId),
    statusIdx: index("generations_status_idx").on(table.status),
    createdAtIdx: index("generations_created_at_idx").on(table.createdAt),
    isPublicIdx: index("generations_is_public_idx").on(table.isPublic),
    isFavoriteIdx: index("generations_is_favorite_idx").on(table.isFavorite),
    userIdCreatedAtIdx: index("generations_user_id_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
    userIdFk: foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "generations_user_id_fk",
    }).onDelete("cascade"),
  }),
);

export const refinements = pgTable(
  "refinements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    generationId: uuid("generation_id").notNull(),
    userId: uuid("user_id").notNull(),
    prompt: text("prompt").notNull(),
    negativePrompt: text("negative_prompt"),
    model: text("model").notNull(),
    width: integer("width").notNull().default(512),
    height: integer("height").notNull().default(512),
    steps: integer("steps").notNull().default(20),
    guidanceScale: integer("guidance_scale").notNull().default(7),
    seed: text("seed"),
    strength: integer("strength").notNull().default(75),
    status: text("status").notNull().default("pending"),
    imageUrl: text("image_url"),
    thumbnailUrl: text("thumbnail_url"),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata"),
    isPublic: boolean("is_public").notNull().default(false),
    isFavorite: boolean("is_favorite").notNull().default(false),
    generationTimeMs: integer("generation_time_ms"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    generationIdIdx: index("refinements_generation_id_idx").on(
      table.generationId,
    ),
    userIdIdx: index("refinements_user_id_idx").on(table.userId),
    statusIdx: index("refinements_status_idx").on(table.status),
    createdAtIdx: index("refinements_created_at_idx").on(table.createdAt),
    isPublicIdx: index("refinements_is_public_idx").on(table.isPublic),
    isFavoriteIdx: index("refinements_is_favorite_idx").on(table.isFavorite),
    generationIdCreatedAtIdx: index(
      "refinements_generation_id_created_at_idx",
    ).on(table.generationId, table.createdAt),
    generationIdFk: foreignKey({
      columns: [table.generationId],
      foreignColumns: [generations.id],
      name: "refinements_generation_id_fk",
    }).onDelete("cascade"),
    userIdFk: foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "refinements_user_id_fk",
    }).onDelete("cascade"),
  }),
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  generations: many(generations),
  refinements: many(refinements),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const generationsRelations = relations(generations, ({ one, many }) => ({
  user: one(users, {
    fields: [generations.userId],
    references: [users.id],
  }),
  refinements: many(refinements),
}));

export const refinementsRelations = relations(refinements, ({ one }) => ({
  generation: one(generations, {
    fields: [refinements.generationId],
    references: [generations.id],
  }),
  user: one(users, {
    fields: [refinements.userId],
    references: [users.id],
  }),
}));

// ─── Schema Export ────────────────────────────────────────────────────────────

export const schema = {
  users,
  sessions,
  accounts,
  generations,
  refinements,
  usersRelations,
  sessionsRelations,
  accountsRelations,
  generationsRelations,
  refinementsRelations,
};

// ─── Migration Runner ─────────────────────────────────────────────────────────

async function runMigrations(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new Pool({
    connectionString,
    max: 1,
  });

  const db = drizzle(pool, { schema });

  console.log("Running database migrations...");

  try {
    await migrate(db, { migrationsFolder: "./db/migrations" });
    console.log("Migrations completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

if (require.main === module) {
  runMigrations()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("Fatal migration error:", error);
      process.exit(1);
    });
}

export default runMigrations;
