import { supabaseClient } from "./lib/supabase/client";
import { readFile } from "fs/promises";
import path from "path";

async function testSupabaseUpload() {
  const imagePath = path.resolve(
    __dirname,
    "./Itszz.png"
  );

  const imageBuffer = await readFile(imagePath);

  const filePath = `test-uploads/${Date.now()}-test.png`;

  console.log("Uploading:", filePath);

  const { error: uploadError } = await supabaseClient.storage
    .from(process.env.SUPABASE_BUCKET_NAME!)
    .upload(filePath, imageBuffer, {
      contentType: "image/png",
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicUrl } = supabaseClient.storage
    .from(process.env.SUPABASE_BUCKET_NAME!)
    .getPublicUrl(filePath);

  console.log("Upload successful");
  console.log("Public URL:", publicUrl.publicUrl);
}

testSupabaseUpload().catch((err) => {
  console.error("❌ Supabase upload failed:", err.message);
  process.exit(1);
});