import { InlineKeyboard } from "grammy";
import { prisma } from "./utils/prisma";
import { renderTranslation } from "./utils/renderer";
import translate from "./utils/translate";

const saveWordInlineKeyboard = new InlineKeyboard().text("Save", "save-word");

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
        const createdWord = await prisma.word.create({
            data: {
                value: word.value,
                translations: JSON.stringify(word.translations),
                examples: JSON.stringify(word.examples),
            },
        });
        word.id = createdWord.id;
    } else {
        word.examples = JSON.parse(word.examples);
        word.translations = JSON.parse(word.translations);
    }

    ctx.session.currentWordId = word.id;

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
