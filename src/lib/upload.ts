// 浏览器本地图片存储：转为 base64 data URL，仅存在当前浏览器中，不上传任何服务器。

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];

export async function uploadImage(file: File, _folder: string): Promise<string> {
  if (!IMAGE_TYPES.includes(file.type)) {
    throw new Error("仅支持 png / jpg / gif / webp 图片格式");
  }
  if (file.size > 1024 * 1024) {
    throw new Error("图片大小不能超过 1MB");
  }
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}
