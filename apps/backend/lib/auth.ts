import * as schema from "database/tables";
import { db } from "database/connection";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema
  }),

  emailAndPassword: {
    enabled: true,
  },

  plugins: [bearer()],

  session: {
    expiresIn: 60 * 60 * 24 * 7,
  },
  trustedOrigins: [process.env.FRONTEND_URL!],
});
