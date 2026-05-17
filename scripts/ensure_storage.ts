import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function ensureBucket() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error("Error listing buckets:", listError.message);
    return;
  }

  const bucketName = "ppt_assets";
  const exists = buckets.find(b => b.name === bucketName);

  if (!exists) {
    console.log(`Creating bucket: ${bucketName}...`);
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: true, // Publicly accessible for previews, but we can protect full files later
      fileSizeLimit: 104857600, // 100MB
    });
    if (error) {
      console.error("Error creating bucket:", error.message);
    } else {
      console.log("Bucket created successfully");
    }
  } else {
    console.log(`Bucket ${bucketName} already exists`);
  }
}

ensureBucket();
