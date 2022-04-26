export const renderTranslation = ({ value, translations, examples }) => {
    const NUMBER_OF_TRANSLATIONS = 5;
    const NUMBER_OF_EXAMPLES = 4;

    const regex = new RegExp(value, "gi");

    const renderTranslations = () =>
        translations.length
            ? translations
                  .slice(0, NUMBER_OF_TRANSLATIONS)
                  .map((tr) => `<b>${tr.value}</b>`)
                  .join(", ")
            : "";

    const renderExample = (ex) => `${ex.srcLang.replace(
        regex,
        `<b>${value}</b>`
    )}
<i>${ex.trgLang}</i>`;

    return `
${value}
${renderTranslations()}

${examples.slice(0, NUMBER_OF_EXAMPLES).map(renderExample).join("\n\n")}
    `;
};
