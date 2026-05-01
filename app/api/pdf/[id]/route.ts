import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

/**
 * GET /api/pdf/[id]
 * Proxies Google Drive PDF files to bypass CORS restrictions.
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

    console.log(`[PDF Proxy] Fetching PDF from Google Drive: ${id}`);

    const response = await axios.get(driveUrl, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
      },
      // Ensure we don't hang too long on slow connections
      timeout: 30000, 
    });

    // Check if the response is actually a PDF (sometimes Drive returns an HTML error page even with 200)
    const contentType = response.headers["content-type"];
    if (contentType && !contentType.includes("application/pdf")) {
       console.warn(`[PDF Proxy] Unexpected content type: ${contentType}`);
       // If it's not a PDF, it might be an error page or auth prompt
       if (contentType.includes("text/html")) {
          return NextResponse.json({ error: "Google Drive link is invalid or private" }, { status: 403 });
       }
    }

    return new NextResponse(response.data, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="resource-${id}.pdf"`,
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*", // Allow browser to access this proxied content
      },
    });
  } catch (error: any) {
    console.error("[PDF Proxy] Error fetching from Drive:", error.message);
    
    if (error.response) {
      return NextResponse.json(
        { error: `Google Drive returned ${error.response.status}` },
        { status: error.response.status }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to load PDF via proxy" },
      { status: 500 }
    );
  }
}
