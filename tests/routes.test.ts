import { describe, it, expect } from "vitest";
import { GET as videoGET } from "@/app/v/[id]/route";
import { GET as channelGET } from "@/app/c/[handle]/route";

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

function channelReq(handle: string, query = "") {
  return channelGET(
    new Request(`http://localhost/c/${encodeURIComponent(handle)}${query}`),
    { params: Promise.resolve({ handle: encodeURIComponent(handle) }) }
  );
}

describe("GET /c/[handle]", () => {
  it("returns the redirect page for an @handle (URL-encoded in path)", async () => {
    const res = await channelReq("@MrBeast");
    const body = await res.text();
    expect(res.status).toBe(200);
    expect(body).toContain("vnd.youtube://www.youtube.com/@MrBeast");
    expect(body).not.toContain("sub_confirmation");
  });

  it("returns the redirect page for a UC channel ID", async () => {
    const res = await channelReq("UCX6OQ3DkcsbYNE6H8uQQuVA");
    const body = await res.text();
    expect(body).toContain("/channel/UCX6OQ3DkcsbYNE6H8uQQuVA");
  });

  it("adds sub_confirmation when ?sub=1", async () => {
    const res = await channelReq("@MrBeast", "?sub=1");
    const body = await res.text();
    expect(body).toContain("sub_confirmation=1");
  });

  it("returns the fallback page for garbage", async () => {
    const res = await channelReq("not-a-handle");
    const body = await res.text();
    expect(res.status).toBe(200);
    expect(body).not.toContain("vnd.youtube://");
  });

  it("survives malformed percent-encoding", async () => {
    const res = await channelGET(new Request("http://localhost/c/%E0%A4%A"), {
      params: Promise.resolve({ handle: "%E0%A4%A" }),
    });
    expect(res.status).toBe(200);
  });
});
