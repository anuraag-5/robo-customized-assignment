import { openApiClient } from "../lib/openai/client";
import { Router } from "express";
import { requireAuth } from "../middleware";
import { supabaseClient } from "../lib/supabase/client";

const appRouter = Router();

appRouter.post("/generate_image", requireAuth, async (req, res) => {
  try {
    const { prompt } = req.body;
    const img = await openApiClient.images.generate({
      model: "gpt-image-1-mini",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "low", // Change remove at production
    });

    ///@ts-ignore
    const imageBuffer = Buffer.from(img.data[0].b64_json, "base64");
    const filePath = `generated/${crypto.randomUUID()}.png`;
    await supabaseClient.storage.from(process.env.SUPABASE_BUCKET_NAME!).upload(filePath, imageBuffer, {
      contentType: "image/png",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Error";
    return res.status(500).json({
        success: false,
        message: errorMessage
    })
  }
});

appRouter.post("/generate_text", requireAuth, async (req, res) => {});
