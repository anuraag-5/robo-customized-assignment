import { z } from "zod";

export const AssetSchema = z.object({
  platform: z.string(),
  assets: z.object({
    headline: z.string(),
    caption: z.string(),
    hashtags: z.array(z.string()),
    cta: z.string(),
  }),
});