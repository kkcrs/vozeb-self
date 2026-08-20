// 上游常见图片/视频接口按“词数”限制 prompt：每个 CJK 字符计 1，每个拉丁/数字单词计 1，上限通常为 512。
// 该限制来自供应商公开返回的校验错误（prompt length between [1,512]），不是拍脑袋常数。
// CJK 字符范围包含汉字、假名、谚文、全角以及 CJK 标点（\u3000-\u303f），与上游“每个 CJK 字符计 1”的规则对齐。
export const UPSTREAM_PROMPT_MAX_WORDS = 512;

const UPSTREAM_CJK_CHAR = /\p{Script=Han}|[\u3000-\u303f\u3040-\u30ff\uac00-\ud7af\uff00-\uffef]/gu;
const UPSTREAM_CJK_CHAR_TEST = /\p{Script=Han}|[\u3000-\u303f\u3040-\u30ff\uac00-\ud7af\uff00-\uffef]/u;
const UPSTREAM_LATIN_WORD = /[A-Za-z0-9]+/g;

export function countUpstreamPromptWords(text: string) {
    const cjk = (text.match(UPSTREAM_CJK_CHAR) || []).length;
    const words = (text.replace(UPSTREAM_CJK_CHAR, " ").match(UPSTREAM_LATIN_WORD) || []).length;
    return cjk + words;
}

export function limitUpstreamPromptWords(text: string, max = UPSTREAM_PROMPT_MAX_WORDS) {
    if (countUpstreamPromptWords(text) <= max) return text;
    // 从头部逐行删除背景行，保留尾部核心指令；至少保留一行。
    const lines = text.split("\n");
    let start = 0;
    while (start < lines.length - 1 && countUpstreamPromptWords(lines.slice(start).join("\n")) > max) start += 1;
    const kept = lines.slice(start).join("\n");
    if (countUpstreamPromptWords(kept) <= max) return kept;
    // 单行仍超限：按 token 从头部截断，非计数标点尽量保留以维持可读性。
    const tokens = kept.match(/\p{Script=Han}|[\u3000-\u303f\u3040-\u30ff\uac00-\ud7af\uff00-\uffef]|[A-Za-z0-9]+|./gu) || [];
    let count = 0;
    let result = "";
    for (const token of tokens) {
        const isCjk = UPSTREAM_CJK_CHAR_TEST.test(token);
        const isWord = /^[A-Za-z0-9]+$/.test(token);
        if ((isCjk || isWord) && count >= max) break;
        if (isCjk || isWord) count += 1;
        result += token;
    }
    return result;
}
