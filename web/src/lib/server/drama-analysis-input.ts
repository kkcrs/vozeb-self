import { resolveDramaShotDuration } from "@/lib/server/drama-shot-config";

export type DramaAnalyzeBody = {
    phase?: "content" | "visual";
    script?: string;
    summary?: string;
    style?: string;
    episode?: unknown;
    characters?: unknown;
    scenes?: unknown;
    props?: unknown;
    clues?: unknown;
    shots?: unknown;
};

export function dramaAnalysisText(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

/** 每个视觉请求覆盖的镜头数。现有文本超时是 3 分钟，16 镜一次请求会被上游中止，必须分批覆盖全部镜头。 */
export const DRAMA_VISUAL_SHOT_WINDOW = 4;

export function dramaVisualShotWindows<T>(shots: readonly T[]): T[][] {
    if (!shots.length) return [];
    const size = Math.min(DRAMA_VISUAL_SHOT_WINDOW, shots.length);
    const windows: T[][] = [];
    for (let index = 0; index < shots.length; index += size) windows.push(shots.slice(index, index + size));
    return windows;
}

export function buildDramaVisualWindowInput<T extends { id: string }>(
    payload: { project: unknown; episode: unknown; assets: unknown; shots: T[] },
    windowShots: T[],
    previousVisuals: Array<{ shotId: string; cameraMotion: string; continuity: unknown }>,
) {
    return {
        project: payload.project,
        episode: payload.episode,
        assets: payload.assets,
        shots: windowShots,
        previousVisuals,
    };
}

export function compactDramaVisualContinuity(shots: Array<{ shotId: string; cameraMotion: string; continuity: unknown }>) {
    return shots.map((shot) => ({ shotId: shot.shotId, cameraMotion: shot.cameraMotion, continuity: shot.continuity }));
}

export function normalizeDramaVisualInput(body: DramaAnalyzeBody) {
    const shots = array(body.shots).flatMap((value) => {
        const shot = object(value);
        const id = dramaAnalysisText(shot.id);
        if (!id) return [];
        return [
            {
                id,
                title: dramaAnalysisText(shot.title),
                description: dramaAnalysisText(shot.description),
                sourceText: dramaAnalysisText(shot.sourceText),
                shotBoundary: dramaAnalysisText(shot.shotBoundary),
                dialogue: dramaAnalysisText(shot.dialogue),
                narration: dramaAnalysisText(shot.narration),
                utterances: normalizeUtterances(shot.utterances),
                duration: resolveDramaShotDuration(shot.duration, 5),
                characterIds: texts(shot.characterIds),
                sceneId: dramaAnalysisText(shot.sceneId),
                propIds: texts(shot.propIds),
                clueIds: texts(shot.clueIds),
            },
        ];
    });
    return {
        shotIds: shots.map((shot) => shot.id),
        payload: {
            project: { summary: dramaAnalysisText(body.summary), style: dramaAnalysisText(body.style) },
            episode: compactVisualEpisode(body.episode),
            assets: {
                characters: normalizeVisualAssets(body.characters),
                scenes: normalizeVisualAssets(body.scenes),
                props: normalizeVisualAssets(body.props),
                clues: normalizeVisualAssets(body.clues),
            },
            shots,
        },
    };
}

function compactVisualEpisode(value: unknown) {
    const episode = object(value);
    return {
        id: dramaAnalysisText(episode.id),
        title: dramaAnalysisText(episode.title),
        outline: dramaAnalysisText(episode.outline),
        hook: dramaAnalysisText(episode.hook),
        nextPreview: dramaAnalysisText(episode.nextPreview),
        sourceRange: dramaAnalysisText(episode.sourceRange),
    };
}

function normalizeVisualAssets(value: unknown) {
    return array(value).flatMap((item) => {
        const asset = object(item);
        const name = dramaAnalysisText(asset.name);
        if (!name) return [];
        const profile = object(asset.profile);
        return [
            {
                id: dramaAnalysisText(asset.id),
                name,
                description: dramaAnalysisText(asset.description),
                profile: {
                    visualIdentity: dramaAnalysisText(profile.visualIdentity),
                    styling: dramaAnalysisText(profile.styling),
                    colorPalette: dramaAnalysisText(profile.colorPalette),
                    consistencyRules: dramaAnalysisText(profile.consistencyRules),
                },
                payoff: dramaAnalysisText(asset.payoff),
            },
        ];
    });
}

function normalizeUtterances(value: unknown) {
    return array(value).flatMap((item, index) => {
        const utterance = object(item);
        const text = dramaAnalysisText(utterance.text);
        if (!text) return [];
        return [
            {
                id: dramaAnalysisText(utterance.id),
                order: Math.max(1, Math.floor(Number(utterance.order) || index + 1)),
                type: utterance.type === "voiceover" ? "voiceover" : "dialogue",
                speaker: dramaAnalysisText(utterance.speaker),
                text,
            },
        ];
    });
}

function texts(value: unknown) {
    return array(value).map(dramaAnalysisText).filter(Boolean);
}

function object(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function array(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}
