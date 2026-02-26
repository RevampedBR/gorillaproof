/**
 * Detect file category from MIME type.
 */
export function getFileCategory(
    mimeType: string
): "image" | "video" | "pdf" | "design" | "unknown" {
    if (!mimeType) return "unknown";
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType === "application/pdf") return "pdf";
    if (
        mimeType === "application/postscript" ||
        mimeType === "application/illustrator" ||
        mimeType === "image/vnd.adobe.photoshop" ||
        mimeType === "application/octet-stream"
    )
        return "design";
    return "unknown";
}
