import { describe, it, expect } from "vitest";
import { GET as videoGET } from "@/app/v/[id]/route";

const VID = "dQw4w9WgXcQ";

function videoReq(id: string) {
  return videoGET(new Request(`http://localhost/v/${id}`), {
    params: Promise.resolve({ id }),
  });
}

describe("GET /v/[id]", () => {
  it("returns the redirect page for a valid ID", async () => {
    const res = await videoReq(VID);
    const body = await res.text();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/html");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage");
    expect(body).toContain(`intent://www.youtube.com/watch?v=${VID}`);
    expect(body).toContain(`vnd.youtube://www.youtube.com/watch?v=${VID}`);
  });

  it("returns the fallback page for an invalid ID", async () => {
    const res = await videoReq("<script>alert(1)</script>");
    const body = await res.text();
    expect(res.status).toBe(200);
    expect(body).not.toContain("<script>alert(1)</script>");
    expect(body).toContain("https://www.youtube.com");
    expect(body).not.toContain("intent://");
  });
});
