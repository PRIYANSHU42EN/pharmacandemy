import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/pdf/[id]
 * Proxies Google Drive PDF files to bypass CORS restrictions with streaming.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "File ID is required" }, { status: 400 });
    }

    // Convert to Google Drive direct download link
    const driveUrl = `https://drive.google.com/uc?export=download&id=${id}`;

    console.log(`[PDF Proxy] Streaming PDF from Google Drive: ${id}`);

    const response = await fetch(driveUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
        return NextResponse.json(
            { error: `Google Drive returned ${response.status}` },
            { status: response.status }
        );
    }

    // Check if the response is actually a PDF
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/pdf") && !contentType.includes("application/octet-stream")) {
       console.warn(`[PDF Proxy] Unexpected content type: ${contentType}`);
       if (contentType.includes("text/html")) {
          return NextResponse.json({ error: "Google Drive link is invalid, private, or requires virus scan approval for large files." }, { status: 403 });
       }
    }

    return new NextResponse(response.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="resource-${id}.pdf"`,
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
        "Content-Length": response.headers.get("Content-Length") || "",
      },
    });
  } catch (error: any) {
    console.error("[PDF Proxy] Error fetching from Drive:", error.message);
    return NextResponse.json(
      { error: "Failed to load PDF via proxy" },
      { status: 500 }
    );
  }
}
