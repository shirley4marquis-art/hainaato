import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

const MAX_BLOB_ATTACHMENT_BYTES = 100 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid upload request." }, { status: 400 });
  }

  try {
    const response = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const payload = clientPayload ? JSON.parse(clientPayload) as { contentType?: string; quoteRef?: string } : {};
        const contentType = payload.contentType || "application/octet-stream";
        return {
          allowedContentTypes: [contentType],
          maximumSizeInBytes: MAX_BLOB_ATTACHMENT_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ quoteRef: payload.quoteRef ?? null }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log("[quote-attachments] upload completed", { pathname: blob.pathname, tokenPayload });
      },
    });
    return NextResponse.json(response);
  } catch (error) {
    console.error("[quote-attachments] upload failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Attachment upload failed." },
      { status: 500 }
    );
  }
}
