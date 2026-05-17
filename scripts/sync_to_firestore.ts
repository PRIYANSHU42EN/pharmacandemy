import { createClient } from "@supabase/supabase-js";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";

function getEnv(key: string) {
  const content = fs.readFileSync(".env.local", "utf-8");
  const match = content.match(new RegExp(`^${key}=(.*)$`, "m"));
  if (!match) return undefined;
  let val = match[1].trim();
  if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  return val;
}

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const firebaseCreds = JSON.parse(getEnv("FIREBASE_SERVICE_ACCOUNT_KEY") || "{}");

if (!supabaseUrl || !supabaseKey || !firebaseCreds.project_id) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const app = getApps().length === 0 ? initializeApp({
  credential: cert(firebaseCreds),
}) : getApps()[0];

const db = getFirestore(app);

async function sync() {
  console.log("Fetching resources from Supabase...");
  const { data: resources, error } = await supabase.from("resources").select("*");
  
  if (error) {
    console.error("Supabase error:", error);
    return;
  }

  console.log(`Found ${resources?.length} resources. Syncing to Firestore...`);

  for (const res of resources || []) {
    const docRef = db.collection("resources").doc(res.id);
    await docRef.set({
      title: res.title,
      description: res.description,
      type: res.type,
      url: res.url,
      courseId: res.course_id,
      subjectId: res.subject_id,
      tags: res.tags || [],
      year: res.year,
      isDeleted: res.is_deleted || false,
      createdAt: res.created_at,
      updatedAt: res.updated_at,
    }, { merge: true });
    console.log(`Synced: ${res.title}`);
  }

  console.log("Sync complete!");
}

sync();
