import { describe, expect, it } from "vitest";

import { buildDramaVisualWindowInput, compactDramaVisualContinuity, dramaVisualShotWindows, normalizeDramaVisualInput } from "./drama-analysis-input";

describe("normalizeDramaVisualInput", () => {
    it("keeps every reviewed shot, asset, utterance, relation and full text", () => {
        const longDescription = "镜头描述".repeat(2_500);
        const shots = Array.from({ length: 81 }, (_, index) => ({
            id: `shot-${index}`,
            title: `镜头 ${index}`,
            description: index === 80 ? longDescription : "描述",
            sourceText: "原文",
            duration: index === 80 ? 21 : 5,
            utterances: Array.from({ length: 101 }, (__, utteranceIndex) => ({ id: `utterance-${utteranceIndex}`, order: utteranceIndex + 1, type: "dialogue", speaker: "角色", text: `台词 ${utteranceIndex}` })),
            characterIds: Array.from({ length: 51 }, (__, relationIndex) => `character-${relationIndex}`),
            propIds: Array.from({ length: 51 }, (__, relationIndex) => `prop-${relationIndex}`),
            clueIds: Array.from({ length: 51 }, (__, relationIndex) => `clue-${relationIndex}`),
        }));
        const characters = Array.from({ length: 201 }, (_, index) => ({ id: `character-${index}`, name: `角色 ${index}`, description: index === 200 ? longDescription : "角色设定" }));

        const result = normalizeDramaVisualInput({
            phase: "visual",
            summary: longDescription,
            characters,
            shots,
            episode: {
                id: "episode-one",
                title: "第 1 集",
                outline: "大纲",
                hook: "钩子",
                nextPreview: "预告",
                sourceRange: "第 1 节",
                reviewStatus: "approved",
                script: "完整剧本不应进入视觉输入",
                shots,
            },
        });

        expect(result.shotIds).toHaveLength(81);
        expect(result.payload.assets.characters).toHaveLength(201);
        expect(result.payload.shots[80]).toMatchObject({ description: longDescription, duration: 21 });
        expect(result.payload.shots[80].utterances).toHaveLength(101);
        expect(result.payload.shots[80].characterIds).toHaveLength(51);
        expect(result.payload.shots[80].propIds).toHaveLength(51);
        expect(result.payload.shots[80].clueIds).toHaveLength(51);
        expect(result.payload.project.summary).toBe(longDescription);
        expect(result.payload.assets.characters[200].description).toBe(longDescription);
        expect(result.payload.episode).toEqual({ id: "episode-one", title: "第 1 集", outline: "大纲", hook: "钩子", nextPreview: "预告", sourceRange: "第 1 节" });
        expect(result.payload.episode).not.toHaveProperty("shots");
        expect(result.payload.episode).not.toHaveProperty("reviewStatus");
    });

    it("splits visual shots into windows that still cover every shot", () => {
        const shots = Array.from({ length: 16 }, (_, index) => ({ id: `shot-${index}` }));
        const windows = dramaVisualShotWindows(shots);
        expect(windows).toHaveLength(4);
        expect(windows.map((window) => window.map((shot) => shot.id))).toEqual([
            ["shot-0", "shot-1", "shot-2", "shot-3"],
            ["shot-4", "shot-5", "shot-6", "shot-7"],
            ["shot-8", "shot-9", "shot-10", "shot-11"],
            ["shot-12", "shot-13", "shot-14", "shot-15"],
        ]);
        expect(dramaVisualShotWindows(shots.slice(0, 3))).toEqual([[{ id: "shot-0" }, { id: "shot-1" }, { id: "shot-2" }]]);
        expect(buildDramaVisualWindowInput({ project: { summary: "概要" }, episode: { id: "ep" }, assets: { characters: [] }, shots }, shots.slice(0, 4), compactDramaVisualContinuity([{ shotId: "shot-prev", cameraMotion: "推近", continuity: { shotSize: "中景" } }]))).toEqual({
            project: { summary: "概要" },
            episode: { id: "ep" },
            assets: { characters: [] },
            shots: shots.slice(0, 4),
            previousVisuals: [{ shotId: "shot-prev", cameraMotion: "推近", continuity: { shotSize: "中景" } }],
        });
    });
});
