import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requirePapercutsApiKey } from "@/server/api-key";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function ensureCloudinaryConfigured() {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error("Cloudinary env vars missing");
  }
}

export async function POST(req: Request) {
  const unauthorized = requirePapercutsApiKey(req);
  if (unauthorized) return unauthorized;

  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  try {
    ensureCloudinaryConfigured();
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUri = `data:${file.type || "image/png"};base64,${base64}`;

    const uploaded = await cloudinary.uploader.upload(dataUri, {
      folder: "papercuts",
      resource_type: "image",
    });

    return NextResponse.json({ url: uploaded.secure_url });
  } catch (e) {
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}


