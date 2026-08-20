import { describe, expect, it } from "vitest";

import { buildMiniMaxH3VideoRequest, isMiniMaxH3VideoModel, normalizeMiniMaxResolutionToken, normalizeVideoAspectRatio, normalizeVideoSize, resolveUpstreamVideoDuration, resolveUpstreamVideoResolution, resolveUpstreamVideoRatio, resolveVideoGenerationParameters, sanitizeMiniMaxVideoPayload, videoResolutionEdge, withVideoReferenceFidelity } from "./video-task-config";

describe("resolveVideoGenerationParameters", () => {
    const defaults = { imageSize: "9:16", videoQuality: "1080", videoSeconds: 10 };

    it("uses backend defaults when video parameters are missing", () => {
        expect(resolveVideoGenerationParameters({}, defaults)).toEqual({ size: "9:16", vquality: "1080", videoSeconds: 10 });
    });

    it("keeps explicit video parameters and channel flags", () => {
        expect(resolveVideoGenerationParameters({ size: "1:1", vquality: "480", videoSeconds: "6", videoGenerateAudio: "false", videoWatermark: "true" }, defaults)).toEqual({
            size: "1:1",
            vquality: "480",
            videoSeconds: 6,
            videoGenerateAudio: "false",
            videoWatermark: "true",
        });
    });

    it("treats blank or invalid values as missing", () => {
        expect(resolveVideoGenerationParameters({ size: " ", vquality: "", videoSeconds: 0 }, defaults)).toEqual({ size: "9:16", vquality: "1080", videoSeconds: 10 });
    });

    it("keeps the explicit intelligent duration option", () => {
        expect(resolveVideoGenerationParameters({ videoSeconds: "-1" }, defaults).videoSeconds).toBe(-1);
    });

    it("does not impose a platform duration ceiling before provider normalization", () => {
        expect(resolveVideoGenerationParameters({ videoSeconds: "60" }, defaults).videoSeconds).toBe(60);
    });

    it("selects the first supported duration that is not shorter than the request", () => {
        expect(resolveUpstreamVideoDuration(7, 5, { durationRange: "5、8、10 秒" })).toBe(8);
        expect(resolveUpstreamVideoDuration(12, 5, { durationRange: "5、8、10 秒" })).toBe(10);
    });

    it("clamps continuous provider ranges and uses five seconds by default", () => {
        expect(resolveUpstreamVideoDuration(undefined, 0, { durationRange: "4-15 秒" })).toBe(5);
        expect(resolveUpstreamVideoDuration(3, 5, { durationRange: "4-15 秒" })).toBe(4);
        expect(resolveUpstreamVideoDuration(7, 5, { durationRange: "4-15 秒" })).toBe(7);
        expect(resolveUpstreamVideoDuration(20, 5, { durationRange: "4-15 秒" })).toBe(15);
    });

    it("keeps intelligent duration only when the provider declares it", () => {
        expect(resolveUpstreamVideoDuration(-1, 5, { durationRange: "4-15 秒" })).toBe(5);
        expect(resolveUpstreamVideoDuration(-1, 5, { durationRange: "-1 智能或 5-15 秒" })).toBe(-1);
    });

    it("keeps exact pixel dimensions while exposing a normalized ratio separately", () => {
        expect(normalizeVideoAspectRatio("1280x720")).toBe("16:9");
        expect(normalizeVideoAspectRatio("720 × 1280")).toBe("9:16");
        expect(normalizeVideoSize("720 × 1280")).toBe("720x1280");
        expect(resolveVideoGenerationParameters({ size: "1024x1024" }, defaults).size).toBe("1024x1024");
        expect(resolveVideoGenerationParameters({ size: "1280x720" }, defaults).size).toBe("1280x720");
    });

    it("adds a server-side subject fidelity constraint for visual references", () => {
        const prompt = withVideoReferenceFidelity("让人物自然挥手", [{ type: "image", url: "https://cdn.example.com/reference.png" }]);

        expect(prompt).toContain("让人物自然挥手");
        expect(prompt).toContain("将参考图作为首帧、主体身份、外观和场景的主要依据");
        expect(prompt).toContain("禁止替换主体");
    });

    it("does not change text-to-video or duplicate the fidelity constraint", () => {
        expect(withVideoReferenceFidelity("生成海边日落", [])).toBe("生成海边日落");
        const once = withVideoReferenceFidelity("让镜头缓慢推进", [{ type: "video", url: "https://cdn.example.com/reference.mp4" }]);
        expect(withVideoReferenceFidelity(once, [{ type: "video", url: "https://cdn.example.com/reference.mp4" }])).toBe(once);
    });
});

describe("resolveUpstreamVideoResolution", () => {
    it("maps MiniMax-H3 qualities to provider-supported resolutions", () => {
        expect(resolveUpstreamVideoResolution("MiniMax-H3", "2k")).toBe("2K");
        expect(resolveUpstreamVideoResolution("MiniMax-H3", "720")).toBe("768P");
        expect(resolveUpstreamVideoResolution("models/MiniMax-H3", "2k", { createPath: "/video_generation" })).toBe("2K");
        expect(resolveUpstreamVideoResolution("models/MiniMax-H3", "720", { createPath: "/video_generation" })).toBe("768P");
    });

    it("keeps common resolutions for other models", () => {
        expect(resolveUpstreamVideoResolution("seedance-2.5", "720")).toBe("720p");
        expect(resolveUpstreamVideoResolution("seedance-2.5", "2k")).toBe("2160p");
    });
});

describe("resolveUpstreamVideoRatio", () => {
    it("requires explicit ratio for MiniMax text-to-video", () => {
        expect(resolveUpstreamVideoRatio("MiniMax-H3", "auto", false)).toBe("16:9");
        expect(resolveUpstreamVideoRatio("MiniMax-H3", "9:16", false)).toBe("9:16");
        expect(resolveUpstreamVideoRatio("MiniMax-H3", "auto", true)).toBe("adaptive");
    });
});

describe("sanitizeMiniMaxVideoPayload", () => {
    it("rebuilds MiniMax payloads to the documented request shape", () => {
        expect(isMiniMaxH3VideoModel("models/MiniMax-H3")).toBe(true);
        expect(
            sanitizeMiniMaxVideoPayload("MiniMax-H3", {
                model: "MiniMax-H3",
                prompt: "一只宠物狗在草地上奔跑",
                resolution: "2K (2013)",
                duration: 5,
                ratio: "16:9",
                generate_audio: true,
                watermark: false,
                quality: "2K",
                width: 2560,
            }),
        ).toEqual({
            model: "MiniMax-H3",
            content: [{ type: "text", text: "一只宠物狗在草地上奔跑" }],
            duration: 5,
            ratio: "16:9",
            resolution: "2K",
        });
    });

    it("builds official MiniMax requests without custom template fields", () => {
        expect(
            buildMiniMaxH3VideoRequest({
                model: "models/MiniMax-H3",
                prompt: "一只宠物狗",
                duration: 5,
                ratio: "16:9",
                resolution: "2k",
            }),
        ).toEqual({
            model: "MiniMax-H3",
            content: [{ type: "text", text: "一只宠物狗" }],
            duration: 5,
            ratio: "16:9",
            resolution: "2K",
        });
    });

    it("normalizes legacy MiniMax resolution labels", () => {
        expect(normalizeMiniMaxResolutionToken("2K (2013)")).toBe("2K");
        expect(normalizeMiniMaxResolutionToken("768p")).toBe("768P");
        expect(normalizeMiniMaxResolutionToken("720p")).toBe("768P");
    });
});
