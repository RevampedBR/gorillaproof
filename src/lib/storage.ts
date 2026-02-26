import { createClient } from "@/utils/supabase/client";
import { getFileCategory } from "@/lib/file-utils";

export { getFileCategory };

const BUCKET = "proofs";

export interface UploadResult {
    path: string;
    url: string;
    error: string | null;
}

/**
 * Generates a unique storage path for a proof file.
 * Format: {org_id}/{project_id}/{proof_id}/v{version}/{filename}
 */
function buildPath(
    orgId: string,
    projectId: string,
    proofId: string,
    versionNumber: number,
    filename: string
): string {
    // Sanitize filename: lowercase, replace spaces with hyphens
    const safe = filename.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9.\-_]/g, "");
    const timestamp = Date.now();
    return `${orgId}/${projectId}/${proofId}/v${versionNumber}/${timestamp}-${safe}`;
}

/**
 * Upload a file to Supabase Storage.
 */
export async function uploadProofFile(
    orgId: string,
    projectId: string,
    proofId: string,
    versionNumber: number,
    file: File
): Promise<UploadResult> {
    const supabase = createClient();
    const path = buildPath(orgId, projectId, proofId, versionNumber, file.name);

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
        });

    if (error) {
        return { path: "", url: "", error: error.message };
    }

    const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path);

    // For private buckets, we use createSignedUrl instead
    const { data: signedData } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60 * 24); // 24h signed URL

    return {
        path,
        url: signedData?.signedUrl || urlData.publicUrl,
        error: null,
    };
}

/**
 * Get a signed URL for a file in storage.
 */
export async function getSignedUrl(path: string): Promise<string> {
    const supabase = createClient();
    const { data } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60 * 24); // 24h

    return data?.signedUrl || "";
}


/**
 * Accepted file types for the dropzone.
 */
export const ACCEPTED_FILE_TYPES: Record<string, string[]> = {
    "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".tiff", ".tif", ".psd"],
    "video/*": [".mp4", ".mov", ".webm"],
    "application/pdf": [".pdf"],
};

export const ACCEPTED_EXTENSIONS = [
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".tiff", ".tif",
    ".psd", ".mp4", ".mov", ".webm", ".pdf",
];

export const MAX_FILE_SIZE = 250 * 1024 * 1024; // 250MB
