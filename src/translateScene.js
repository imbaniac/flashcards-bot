import { InlineKeyboard } from "grammy";
import { prisma } from "./utils/prisma";
import { renderTranslation } from "./utils/renderer";
import Reverso from "./utils/Reverso";
import translate, { reverso } from "./utils/translate";

export const translateAction = async (ctx) => {
    console.log("TRANSLATING");
    let word = await prisma.word.findUnique({
        where: {
            value: ctx.message.text.toLocaleLowerCase(),
        },
    });

    if (!word) {
        console.log("REQUEST");
        word = await translate(ctx.message.text);
        let existedWord = await prisma.word.findUnique({
            where: {
                value: word.value,
            },
        });
        if (!existedWord) {
            const createdWord = await prisma.word.create({
                data: {
                    value: word.value,
                    translations: JSON.stringify(word.translations),
                    examples: JSON.stringify(word.examples),
                },
            });
            word.id = createdWord.id;
        } else {
            word.id = existedWord.id;
        }
    } else {
        word.examples = JSON.parse(word.examples);
        word.translations = JSON.parse(word.translations);
    }

    ctx.session.currentWordId = word.id;

    const saveWordInlineKeyboard = new InlineKeyboard()
        .text("Listen", `audio:${word.value}`)
        .text("Save", "save-word");

    await ctx.reply(renderTranslation(word), {
        parse_mode: "HTML",
        reply_markup: saveWordInlineKeyboard,
    });
};

export const saveWordAction = async (ctx) => {
    await prisma.userWord.create({
        data: {
            userId: ctx.from.id,
            wordId: ctx.session.currentWordId,
        },
    });
    await ctx.editMessageReplyMarkup(null);

    await ctx.answerCallbackQuery({
        text: "Added to your dictionary",
    });
};

export const listenWordAction = async (ctx) => {
    const url = reverso.getVoiceUrl(ctx.session.audio);
    const inlineKeyboard = new InlineKeyboard().text("Clear", "delete");
    await ctx.api.raw.sendAudio({
        chat_id: ctx.from.id,
        audio: url,
        title: ctx.session.audio,
        reply_markup: inlineKeyboard,
    });
};
