
'use client';

// In a real app, use environment variables:
// const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
// const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const CLOUDINARY_CLOUD_NAME = "dzxcregg6";
const CLOUDINARY_UPLOAD_PRESET = "course";

interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  version: number;
  width?: number;
  height?: number;
  format?: string;
  created_at: string;
  bytes: number;
  resource_type: "image" | "video" | "raw" | "auto";
  original_filename: string;
  // Add other fields if needed
}

export async function uploadToCloudinary(file: File): Promise<CloudinaryUploadResponse> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    console.error("Cloudinary environment variables not set.");
    throw new Error("Cloudinary cloud name or upload preset is not configured.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, // Using /auto/upload for versatility
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Cloudinary upload error details:", errorData);
      throw new Error(
        `Cloudinary upload failed: ${errorData?.error?.message || response.statusText}`
      );
    }

    const data: CloudinaryUploadResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error during Cloudinary upload:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to upload to Cloudinary: ${error.message}`);
    }
    throw new Error("An unknown error occurred during Cloudinary upload.");
  }
}
