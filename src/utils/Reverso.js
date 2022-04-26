import cheerio from "cheerio";
import {
    checkContextLang,
    checkSpellLang,
    checkSynonymsLang,
} from "./langcheck.js";

const urls = {
    contextUrl: "https://context.reverso.net/translation/",
    spellCheckUrl: "https://orthographe.reverso.net/api/v1/Spelling",
    synonymsUrl: "https://synonyms.reverso.net/synonym/",
};

export default class Reverso {
    /**
     * Looks for examples of using requested text in target language.
     * @public
     * @param {string} text a word or sentence that you need to know how to use in target language.
     * @param {string} srcLang a source language of the text. Available languages: English, Russian, German, Spanish, French, Italian, Polish.
     * @param {string} trgLang a target language of examples you need. Available languages: English, Russian, German, Spanish, French, Italian, Polish.
     */
    getContext(text, srcLang, trgLang) {
        checkContextLang(srcLang.toLowerCase(), trgLang.toLowerCase());

        let url =
            urls.contextUrl +
            srcLang.toLowerCase() +
            "-" +
            trgLang.toLowerCase() +
            "/" +
            encodeURIComponent(text);

        console.log("URL", url);

        return fetch(url)
            .then((response) => response.text())
            .then((text) => {
                const $ = cheerio.load(text);
                let examples = [];

                const correctForm = $("body")
                    .find("#search-content")
                    .find("input")
                    .val();

                const translations = $("body")
                    .find("#translations-content")
                    .find(".translation")
                    .text()
                    .trim()
                    .split("\n")
                    .map((tr, i) => ({
                        id: i,
                        value: tr.trimStart(),
                    }))
                    .filter((tr) => tr.value);

                let srcLangExample = $("body")
                    .find(".example")
                    .find('div[class="src ltr"] > span[class="text"]')
                    .text()
                    .trim()
                    .split("\n");
                let trgLangExample = $("body")
                    .find(".example")
                    .find('div[class="trg ltr"] > span[class="text"]')
                    .text()
                    .trim()
                    .split("\n");

                for (let i = 0; i < srcLangExample.length; i++) {
                    examples.push({
                        id: i,
                        srcLang: srcLangExample[i].trimStart(),
                        trgLang: trgLangExample[i].trimStart(),
                    });
                }

                return {
                    text,
                    correctForm,
                    translations,
                    examples,
                };
            })
            .catch((error) => {
                console.log(error);
                console.error(
                    "\nError: reverso.net did not respond or there are no context examples for the given text.\n"
                );
            });
    }

    /**
     * Checks spelling of requested text.
     * @public
     * @param {string} text a word or sentence that you need to check.
     * @param {string} lang a source language of the text. Available languages: English and French.
     */
    getSpellCheck(text, lang) {
        checkSpellLang(lang.toLowerCase());

        let resLang = {
            english: "eng",
            french: "fra",
        };

        let url =
            urls.spellCheckUrl +
            `?text=${encodeURIComponent(text)}&language=${
                resLang[lang.toLowerCase()]
            }&getCorrectionDetails=true`;

        return fetch(url)
            .then((response) => {
                let data = response.data;
                let result = [];

                for (let i = 0; i < data.corrections.length; i++) {
                    result.push({
                        id: i,
                        full_text: data.text,
                        type: data.corrections[i].type,
                        explanation: data.corrections[i].longDescription,
                        corrected: data.corrections[i].correctionText,
                    });
                }

                return result;
            })
            .catch(() => {
                console.error(
                    "\nError: reverso.net did not respond or your text has no mistakes.\n"
                );
            });
    }

    /**
     * Looks for synonyms of requested text.
     * @public
     * @param {string} text a word or phrase that you need to check.
     * @param {string} lang a source language of the text. Available languages: English, Russian, German, Spanish, French, Italian, Polish.
     */
    getSynonyms(text, lang) {
        checkSynonymsLang(lang.toLowerCase());

        let resLang = {
            english: "en",
            french: "fr",
            german: "de",
            russian: "ru",
            italian: "it",
            polish: "pl",
            spanish: "es",
        };

        let url =
            urls.synonymsUrl +
            `${resLang[lang.toLowerCase()]}/${encodeURIComponent(text)}`;

        return fetch(url)
            .then((response) => {
                const $ = cheerio.load(response.data);
                const result = [];

                $("body")
                    .find(
                        'button[class="copy-to-clipboard icon copy-for-context cursor-pointer"]'
                    )
                    .each((i, e) => {
                        result.push({
                            id: i,
                            synonym: $(e).attr("data-word"),
                        });
                    });

                return result;
            })
            .catch(() => {
                console.error(
                    "\nError: reverso.net did not respond or there are no synonyms for the given text.\n"
                );
            });
    }

    getVoiceUrl(text) {
        const url = `https://voice.reverso.net/RestPronunciation.svc/v1/output=json/GetVoiceStream/voiceName=Heather22k?voiceSpeed=100&inputText=${btoa(
            text
        )}`;
        return url;
    }
}
