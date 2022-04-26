import { InlineKeyboard } from "grammy";
import { prisma } from "./utils/prisma";
import { renderTranslation } from "./utils/renderer";
import sm2 from "./utils/sm2";

export const learnAction = async (ctx) => {
    // TODO: change to SQL logic
    const userWords = await prisma.userWord.findMany({
        where: {
            userId: ctx.from.id,
        },
        include: { word: true, results: true },
    });

    const currentLearningWords = userWords
        .filter((learningWord) => {
            if (!learningWord.results.length) return true;
            const lastResult =
                learningWord.results[learningWord.results.length - 1];
            const shouldBeLearnedToday =
                new Date() >= new Date(lastResult.date);
            return shouldBeLearnedToday;
        })
        .sort((a, b) => {
            const aLastResult = a.results[a.results.length - 1];
            const bLastResult = b.results[b.results.length - 1];

            if (!aLastResult && !bLastResult) {
                return 0;
            }
            if (!aLastResult) {
                return -1;
            }
            if (!bLastResult) {
                return 1;
            }

            return new Date(aLastResult.date) - new Date(bLastResult.date);
        });

    if (!currentLearningWords.length) {
        try {
            await ctx.editMessageText("All words for today are learned");
        } catch (e) {
            await ctx.reply("All words for today are learned");
        }
    } else {
        const inlineKeyboard = new InlineKeyboard().text(
            "Show answer",
            `show_answer:${currentLearningWords[0].word.id}`
        );

        try {
            await ctx.editMessageText(
                `<b>${currentLearningWords[0].word.value}</b>`,
                {
                    parse_mode: "HTML",
                    reply_markup: inlineKeyboard,
                }
            );
        } catch (e) {
            await ctx.reply(`<b>${currentLearningWords[0].word.value}</b>`, {
                parse_mode: "HTML",
                reply_markup: inlineKeyboard,
            });
        }
    }
};

export const showAnswerAction = async (ctx) => {
    const word = await prisma.word.findUnique({
        where: {
            id: ctx.session.currentWordId,
        },
    });
    word.examples = JSON.parse(word.examples);
    word.translations = JSON.parse(word.translations);

    const inlineKeyboard = new InlineKeyboard()
        .text("Сложно 😔", "answer:0")
        .text("Так себе 🤔", "answer:3")
        .text("Легко ✅", "answer:5");

    await ctx.editMessageText(renderTranslation(word), {
        parse_mode: "HTML",
        reply_markup: inlineKeyboard,
    });
};

export const saveResultAction = async (ctx) => {
    const userWord = await prisma.userWord.findFirst({
        where: {
            wordId: ctx.session.currentWordId,
            userId: ctx.from.id,
        },
        include: { results: true },
    });

    const latestResult = userWord.results[userWord.results - 1];

    const { factor, repetitions, interval, date } = sm2({
        grade: ctx.session.grade,
        factor: latestResult ? +latestResult.factor : 0,
        repetitions: latestResult?.repetitions,
    });

    await prisma.userWord.update({
        where: {
            id: userWord.id,
        },
        data: {
            results: {
                create: {
                    factor: String(factor),
                    repetitions,
                    interval,
                    date,
                    grade: ctx.session.grade,
                },
            },
        },
    });

    await learnAction(ctx);
};
