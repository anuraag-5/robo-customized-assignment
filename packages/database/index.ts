import { drizzle } from 'drizzle-orm/neon-http';

export { eq, like } from "drizzle-orm";
export const db = drizzle(process.env.DATABASE_URL!);