import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    issuer: text("issuer").notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("account_issuer_accountId_uidx").on(
      table.issuer,
      table.accountId,
    ),
    index("account_userId_idx").on(table.userId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const providerProfile = pgTable("provider_profile", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  phone: text("phone").notNull(),
  phoneIsWhatsapp: boolean("phone_is_whatsapp").default(true).notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  hourlyRateCents: integer("hourly_rate_cents"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const serviceCategory = pgTable("service_category", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull(),
});

export const providerService = pgTable(
  "provider_service",
  {
    providerId: text("provider_id")
      .notNull()
      .references(() => providerProfile.id, { onDelete: "cascade" }),
    categorySlug: text("category_slug")
      .notNull()
      .references(() => serviceCategory.slug, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
  },
  (table) => [
    primaryKey({ columns: [table.providerId, table.categorySlug] }),
    index("provider_service_category_idx").on(table.categorySlug),
  ],
);

export const providerArea = pgTable(
  "provider_area",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    providerId: text("provider_id")
      .notNull()
      .references(() => providerProfile.id, { onDelete: "cascade" }),
    neighborhood: text("neighborhood").notNull(),
    neighborhoodKey: text("neighborhood_key").notNull(),
  },
  (table) => [
    uniqueIndex("provider_area_provider_key_uidx").on(
      table.providerId,
      table.neighborhoodKey,
    ),
    index("provider_area_key_idx").on(table.neighborhoodKey),
  ],
);

export const userRelations = relations(user, ({ one, many }) => ({
  sessions: many(session),
  accounts: many(account),
  providerProfile: one(providerProfile),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const providerProfileRelations = relations(
  providerProfile,
  ({ one, many }) => ({
    user: one(user, {
      fields: [providerProfile.userId],
      references: [user.id],
    }),
    services: many(providerService),
    areas: many(providerArea),
  }),
);

export const serviceCategoryRelations = relations(
  serviceCategory,
  ({ many }) => ({
    providers: many(providerService),
  }),
);

export const providerServiceRelations = relations(
  providerService,
  ({ one }) => ({
    provider: one(providerProfile, {
      fields: [providerService.providerId],
      references: [providerProfile.id],
    }),
    category: one(serviceCategory, {
      fields: [providerService.categorySlug],
      references: [serviceCategory.slug],
    }),
  }),
);

export const providerAreaRelations = relations(providerArea, ({ one }) => ({
  provider: one(providerProfile, {
    fields: [providerArea.providerId],
    references: [providerProfile.id],
  }),
}));
