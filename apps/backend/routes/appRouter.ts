import { eq, and } from "drizzle-orm";
import { db } from "database/connection";
import { Router } from "express";
import { usersChat } from "database/tables";
import { AssetSchema } from "../lib/openai/outputTypes";
import { requireAuth } from "../middleware";
import { zodTextFormat } from "openai/helpers/zod.js";
import { openApiClient } from "../lib/openai/client";
import { supabaseClient } from "../lib/supabase/client";

const appRouter = Router();

appRouter.post("/generate_image", requireAuth, async (req, res) => {
  try {
    const { prompt, chatId } = req.body;
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
    await supabaseClient.storage
      .from(process.env.SUPABASE_BUCKET_NAME!)
      .upload(filePath, imageBuffer, {
        contentType: "image/png",
      });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown Error";
    return res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
});

appRouter.post("/generate_text", requireAuth, async (req, res) => {
  try {
    const { prompt, chatId } = req.body;

    if (!prompt || !chatId) {
      return res.status(400).json({
        success: false,
        message: "Prompt and chatId are required",
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const existingChat = await db
      .select()
      .from(usersChat)
      .where(and(eq(usersChat.id, chatId), eq(usersChat.userId, req.user.id)));

    const messages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [
      {
        role: "system",
        content:
          "You are an AI marketing assistant that generates structured marketing assets in JSON format.",
      },
    ];

    const MAX_CONTEXT = 5;

    let previousPrompts: any[] = [];
    let previousAnswers: any[] = [];

    if (existingChat[0]) {
      previousPrompts = JSON.parse(existingChat[0].prompts || "[]");
      previousAnswers = JSON.parse(existingChat[0].answers || "[]");

      const recentPrompts = previousPrompts.slice(-MAX_CONTEXT);
      const recentAnswers = previousAnswers.slice(-MAX_CONTEXT);

      for (let i = 0; i < recentPrompts.length; i++) {
        messages.push({
          role: "user",
          content: recentPrompts[i].prompt,
        });

        messages.push({
          role: "assistant",
          content: recentAnswers[i].answer,
        });
      }
    }

    messages.push({
      role: "user",
      content: prompt,
    });

    const response = await openApiClient.responses.parse({
      model: "gpt-4o-mini",
      input: messages,
      text: {
        format: zodTextFormat(AssetSchema, "marketing_asset"),
      },
    });

    const asset = response.output_parsed;

    if (!asset) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate asset",
      });
    }

    const nextIndex = previousPrompts.length;

    const updatedPrompts = [
      ...previousPrompts,
      {
        prompt,
        timestamp: new Date().toISOString(),
        index: nextIndex,
      },
    ];

    const updatedAnswers = [
      ...previousAnswers,
      {
        answer: JSON.stringify(asset),
        timestamp: new Date().toISOString(),
        index: nextIndex,
      },
    ];

    if (existingChat[0]) {
      await db
        .update(usersChat)
        .set({
          prompts: JSON.stringify(updatedPrompts),
          answers: JSON.stringify(updatedAnswers),
          updatedAt: new Date(),
        })
        .where(
          and(eq(usersChat.id, chatId), eq(usersChat.userId, req.user.id)),
        );
    } else {
      await db.insert(usersChat).values({
        id: chatId,
        userId: req.user.id,
        prompts: JSON.stringify(updatedPrompts),
        answers: JSON.stringify(updatedAnswers),
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        asset,
        chatId,
      },
    });
  } catch (error) {
    console.error("Generate text error:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
});

export default appRouter;
