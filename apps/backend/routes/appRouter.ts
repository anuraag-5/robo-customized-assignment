import { eq, and } from "drizzle-orm";
import { db } from "database/connection";
import { Router } from "express";
import { usersChat, usersImage } from "database/tables";
import { AssetSchema } from "../lib/openai/outputTypes";
import { requireAuth } from "../middleware";
import { zodTextFormat } from "openai/helpers/zod.js";
import { openAIClient } from "../lib/openai/client";
import { supabaseClient } from "../lib/supabase/client";
import type { Response } from "openai/resources/responses/responses.js";

const appRouter = Router();

appRouter.post("/generate_image", requireAuth, async (req, res) => {
  try {
    const { prompt, chatId, responseId } = req.body;

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

    if (!process.env.SUPABASE_BUCKET_NAME) {
      throw new Error("Supabase bucket not configured");
    }

    const existingChat = await db
      .select()
      .from(usersChat)
      .where(and(eq(usersChat.id, chatId), eq(usersChat.userId, req.user.id)));

    let response: Response & { _request_id?: string | null };

    if (responseId) {
      response = await openAIClient.responses.create({
        model: "gpt-5",
        input: prompt,
        previous_response_id: responseId,
        tools: [{ type: "image_generation", size: "1024x1024", quality: "low" }], // Change quality to high in production.
      });
    } else {
      response = await openAIClient.responses.create({
        model: "gpt-5",
        input: prompt,
        tools: [{ type: "image_generation", size: "1024x1024", quality: "low" }], // Change quality to high in production.
      });
    }

    const imageData = response.output
      .filter((output) => output.type === "image_generation_call")
      .map((output) => output.result);

    if (imageData.length > 0 && imageData[0]) {
      const imageBase64 = imageData[0];
      const imageBuffer = Buffer.from(imageBase64, "base64");
      const filePath = `generated/${req.user.id}/${chatId}-${Date.now()}.png`;
      const fs = await import("fs");
      fs.writeFileSync(
        "Itszz.png",
        Buffer.from(imageBase64, "base64"),
      );
      const { error: uploadError } = await supabaseClient.storage
        .from(process.env.SUPABASE_BUCKET_NAME)
        .upload(filePath, imageBuffer, {
          contentType: "image/png",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrl } = supabaseClient.storage
        .from(process.env.SUPABASE_BUCKET_NAME)
        .getPublicUrl(filePath);

      if (!publicUrl?.publicUrl) {
        throw new Error("Failed to get public image URL");
      }

      const previousPrompts = existingChat[0]
        ? JSON.parse(existingChat[0].prompts || "[]")
        : [];

      const previousAnswers = existingChat[0]
        ? JSON.parse(existingChat[0].answers || "[]")
        : [];

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
          answer: null,
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

      await db.insert(usersImage).values({
        userId: req.user.id,
        usersChatId: chatId,
        responseId: response.id,
        image: publicUrl.publicUrl,
      });

      return res.status(200).json({
        success: true,
        data: {
          imageUrl: publicUrl.publicUrl,
          chatId,
          responseId: response.id,
        },
      });
    }

    return res.status(500).json({
      success: false,
      message: "Image generation error",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
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
          "You are an AI marketing assistant that generates structured marketing assets in JSON format (Ignore any image creation request from user).",
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

    const response = await openAIClient.responses.parse({
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
