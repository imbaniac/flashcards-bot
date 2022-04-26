import { InlineKeyboard } from "grammy";
import cron from "node-cron";
import { prisma } from "./prisma";
import { MINIMAL_TIMEZONE_SET } from "./time";

export const crons = {};

export const scheduleNotification = async (userId, api) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user.time || !user.timezoneOffset || !user.notificationsEnabled) {
        return null;
    }

    const [hours, minutes] = user.time.split(":").map(Number);

    const timezone = MINIMAL_TIMEZONE_SET.find(
        (tz) => user.timezoneOffset === tz.offset
    ).tzCode;

    return cron.schedule(
        `${minutes} ${hours} * * *`,
        // `* * * * *`,
        async () => {
            console.log("Cron job running", {
                userId,
                timezone,
                hours,
                minutes,
            });
            const userWords = await prisma.userWord.findMany({
                where: {
                    userId,
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

                    return (
                        new Date(aLastResult.date) - new Date(bLastResult.date)
                    );
                });

            if (currentLearningWords.length) {
                const inlineKeyboard = new InlineKeyboard().text(
                    "Show answer",
                    `show_answer:${currentLearningWords[0].word.id}`
                );

                await api.sendMessage(userId, "Time to learn your words 🤔");
                await api.sendMessage(
                    userId,
                    `<b>${currentLearningWords[0].word.value}</b>`,
                    {
                        parse_mode: "HTML",
                        reply_markup: inlineKeyboard,
                    }
                );
            }
        },
        {
            timezone,
        }
    );
};
