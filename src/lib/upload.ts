import { supabase } from "@/db/supabase";

const BUCKET = "chat-assets";

const toHex = (s: string) =>
  Array.from(new TextEncoder().encode(s), (b) => b.toString(16).padStart(2, "0")).join("");

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];

// 上传本地图片到 Storage，返回可公开访问的 URL
export async function uploadImage(file: File, folder: string): Promise<string> {
  if (!IMAGE_TYPES.includes(file.type)) {
    throw new Error("仅支持 png / jpg / gif / webp 图片格式");
  }
  if (file.size > 1024 * 1024) {
    throw new Error("图片大小不能超过 1MB");
  }
  const dot = file.name.lastIndexOf(".");
  const stem = dot > 0 ? file.name.slice(0, dot) : file.name;
  const ext = dot > 0 ? file.name.slice(dot) : "";
  const safeName = `${toHex(stem)}_${Date.now()}${ext}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(`${folder}/${safeName}`, file, { contentType: file.type });
  if (error) throw error;

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return urlData.publicUrl;
}
