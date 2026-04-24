import { arrayBufferToBase64 } from "@/utils/base64";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

/**
 * Build multimodal user content for the LLM: optional text + embedded images.
 */
export async function buildUserMessageContent(
  inputMessage: string,
  selectedImages: File[]
): Promise<ContentPart[]> {
  const content: ContentPart[] = [];
  if (inputMessage) {
    content.push({
      type: "text",
      text: inputMessage,
    });
  }
  for (const image of selectedImages) {
    const imageData = await image.arrayBuffer();
    const base64Image = arrayBufferToBase64(imageData);
    content.push({
      type: "image_url",
      image_url: {
        url: `data:${image.type};base64,${base64Image}`,
      },
    });
  }
  return content;
}
