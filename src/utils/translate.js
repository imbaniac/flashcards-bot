import Reverso from "./Reverso.js";

export const reverso = new Reverso();

const languageMapping = {
    en: "English",
    ru: "Russian",
};

export default async (text) => {
    const { translations, examples, correctForm } = await reverso.getContext(
        text,
        // TODO: hardcoded - add other languages
        languageMapping.ru,
        languageMapping.en
    );

    return {
        translations,
        examples,
        value: correctForm || text,
    };
};
