function formatCode(text) {

    // =========================
    // KEEP SMALL ARRAYS INLINE
    // =========================

    text = text.replace(
        /\[\s*([^\[\]\n]{1,40})\s*\]/g,
        (_, content) => {
            return `[${content.trim()}]`;
        }
    );

    // =========================
    // KEEP SMALL OBJECTS INLINE
    // =========================

    text = text.replace(
        /\{\s*([^\{\}\n]{1,60})\s*\}/g,
        (_, content) => {
            return `{ ${content.trim()} }`;
        }
    );

    // =========================
    // FORCE SAME-LINE BRACES
    // =========================

    text = text.replace(
        /\)\s*\n\s*\{/g,
        ") {"
    );

    // =========================
    // REMOVE EXCESS BLANK LINES
    // =========================

    text = text.replace(
        /\n{3,}/g,
        "\n\n"
    );

    // =========================
    // CLEAN TRAILING SPACES
    // =========================

    text = text.replace(
        /[ \t]+$/gm,
        ""
    );

    return text;
}

module.exports = {
    formatCode
};