import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { DramaEpisode, DramaProject } from "@/lib/drama-project-contract";
import { DramaReviewPanel } from "./drama-review-panel";

vi.mock("../stores/use-drama-store", () => ({
    useDramaStore: (select: (state: { updateEpisode: () => void; updateShot: () => void }) => unknown) => select({ updateEpisode: () => undefined, updateShot: () => undefined }),
}));

vi.mock("./drama-shot-dialogue-editor", () => ({
    DramaShotDialogueEditor: () => null,
}));

describe("drama review panel", () => {
    it("keeps a visible generating and failure state in the review stage", () => {
        const generating = renderToStaticMarkup(<DramaReviewPanel project={projectFixture()} episode={episodeFixture()} designing designError="" onDesignVisuals={() => undefined} onStageChange={() => undefined} />);
        expect(generating).toContain("视觉方案生成中");
        expect(generating).toContain("正在为 1 个镜头生成视觉方案，请保持此页面打开。");
        expect(generating).not.toContain("待确认");

        const failed = renderToStaticMarkup(<DramaReviewPanel project={projectFixture()} episode={episodeFixture()} designing={false} designError="文本模型规划响应超时，正在切换备用渠道" onDesignVisuals={() => undefined} onStageChange={() => undefined} />);
        expect(failed).toContain("生成失败");
        expect(failed).toContain("文本模型规划响应超时，正在切换备用渠道");
        expect(failed).toContain("role=\"alert\"");
        expect(failed).not.toContain("视觉方案已生成");
    });
});

function projectFixture(): DramaProject {
    return {
        id: "project",
        title: "琵琶行",
        summary: "",
        style: "",
        ratio: "9:16",
        status: "active",
        characters: [],
        scenes: [],
        props: [],
        clues: [],
        defaultVideoMode: "storyboard",
        activeEpisodeId: "episode",
        episodes: [episodeFixture()],
        createdAt: "2026-08-20T00:00:00.000Z",
        updatedAt: "2026-08-20T00:00:00.000Z",
    };
}

function episodeFixture(): DramaEpisode {
    return {
        id: "episode",
        title: "第 1 集",
        script: "剧本",
        outline: "",
        hook: "",
        nextPreview: "",
        sourceRange: "",
        reviewStatus: "content_review",
        shots: [
            {
                id: "shot-1",
                order: 1,
                title: "浔阳江头",
                description: "江边送客",
                sourceText: "浔阳江头夜送客",
                shotBoundary: "送客后切镜",
                dialogue: "",
                narration: "",
                utterances: [],
                imagePrompt: "",
                videoPrompt: "",
                cameraMotion: "",
                startFramePrompt: "",
                endFramePrompt: "",
                negativePrompt: "",
                duration: 5,
                characterIds: [],
                sceneId: "",
                propIds: [],
                clueIds: [],
                continuity: {
                    shotSize: "",
                    cameraAngle: "",
                    composition: "",
                    characterBlocking: "",
                    gazeDirection: "",
                    actionStart: "",
                    actionEnd: "",
                    screenDirection: "",
                    axisRule: "",
                    continuityNotes: "",
                },
                storyboardStatus: "idle",
                storyboardEndStatus: "idle",
                generationStatus: "idle",
                audioMode: "source",
                audioStatus: "idle",
            },
        ],
    };
}
