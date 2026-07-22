import { describe, it, expect } from "vitest";
import { parseYouTubeUrl } from "@/lib/youtube";

const VID = "dQw4w9WgXcQ";

describe("parseYouTubeUrl — videos", () => {
  it.each([
    [`https://www.youtube.com/watch?v=${VID}`],
    [`http://youtube.com/watch?v=${VID}`],
    [`https://m.youtube.com/watch?v=${VID}&t=42s`],
    [`https://music.youtube.com/watch?v=${VID}`],
    [`https://youtu.be/${VID}`],
    [`https://youtu.be/${VID}?si=abc123`],
    [`https://www.youtube.com/shorts/${VID}`],
    [`https://www.youtube.com/live/${VID}`],
    [`youtube.com/watch?v=${VID}`], // no scheme
    [`  https://youtu.be/${VID}  `], // whitespace
    [`https://YOUTUBE.COM/watch?v=${VID}`], // uppercase host
  ])("parses %s", (input) => {
    expect(parseYouTubeUrl(input)).toEqual({ kind: "video", id: VID });
  });
});

describe("parseYouTubeUrl — channels", () => {
  it("parses @handle URLs", () => {
    expect(parseYouTubeUrl("https://www.youtube.com/@MrBeast")).toEqual({
      kind: "channel",
      id: "@MrBeast",
    });
  });

  it("parses channel-ID URLs", () => {
    const id = "UCX6OQ3DkcsbYNE6H8uQQuVA";
    expect(parseYouTubeUrl(`https://youtube.com/channel/${id}`)).toEqual({
      kind: "channel",
      id,
    });
  });
});

describe("parseYouTubeUrl — rejects", () => {
  it.each([
    [""],
    ["   "],
    ["not a url at all"],
    ["https://vimeo.com/12345"],
    ["https://evil.com/watch?v=dQw4w9WgXcQ"],
    ["https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ"],
    ["https://youtube.com@evil.com/watch?v=dQw4w9WgXcQ"], // userinfo trick
    ["https://www.youtube.com/watch?v=too_short"],
    ["https://www.youtube.com/watch?v=way_too_long_for_an_id"],
    ["https://www.youtube.com/watch"], // no v param
    ["https://www.youtube.com/"],
    ["https://www.youtube.com/@x"], // handle too short (<3)
    ["https://www.youtube.com/channel/notAChannelId"],
    ["https://www.youtube.com/playlist?list=PL123"],
  ])("returns null for %s", (input) => {
    expect(parseYouTubeUrl(input)).toBeNull();
  });
});
