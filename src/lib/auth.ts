import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/auth-validation";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN,
    maxPasswordLength: PASSWORD_MAX,
    sendResetPassword: async ({ user, url }) => {
      console.log(`[auth] Reset de senha para ${user.email}: ${url}`);
    },
  },
  plugins: [nextCookies()],
});
