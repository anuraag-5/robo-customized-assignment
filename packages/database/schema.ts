import { createId } from "@paralleldrive/cuid2";
import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: varchar().primaryKey().$defaultFn(() => createId()),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  password: varchar({ length: 255 }).notNull(),
  publicAddress: varchar({ length: 255 }).unique()
});

// export const transactionHistory = pgTable("transactionHistory", {
//   id: varchar().primaryKey().$defaultFn(() => createId()),
//   userId: varchar({ length: 255 }).notNull().references(() => usersTable.id),
//   toUserId: varchar({ length: 255 }).notNull().references(() => usersTable.id),
//   fromToken: varchar({ length: 255 }).notNull(),
//   toToken: varchar({ length: 255 }).notNull(),
//   fromQuantity: varchar({ length: 255 }).notNull(),
//   toQuantity: varchar({ length: 255 }).notNull(),
//   conversionRate: varchar({ length: 255 }).notNull(),
//   status: varchar({ length: 255 }).notNull(),
//   createdAt: timestamp().defaultNow().notNull(),
// });