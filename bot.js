import { Bot, GrammyError, HttpError, session } from "grammy";
import env from "env-var";
import {
    learnAction,
    saveResultAction,
    showAnswerAction,
} from "./src/learnScene";
import {
    deleteUserWordAction,
    showLibraryAction,
    viewWordAction,
} from "./src/libraryScene";
import { prisma } from "./src/utils/prisma";
import { translateAction, saveWordAction } from "./src/translateScene";
import {
    notificationsAction,
    notificationsToggleAction,
    editNotificationsTimeAction,
    editNotificationsTimezoneAction,
    setUserTimezoneAction,
    setUserTimeAction,
} from "./src/notificationsScene";
import { scheduleNotification, crons } from "./src/utils/cron";

const bot = new Bot(env.get("BOT_API").asString());

async function main() {
    bot.use(
        session({
            initial: () => ({
                currentWordId: null,
                currentPage: 1,
                grade: null,
                notificationsEnabled: null,
            }),
        })
    );
    bot.api.setMyCommands([
        { command: "library", description: "Library" },
        { command: "learn", description: "Learn" },
        { command: "notifications", description: "Notifications" },
    ]);

    bot.command("library", showLibraryAction);
    bot.command("learn", learnAction);
    bot.command("notifications", notificationsAction);

    bot.command("start", async (ctx) => {
        await ctx.reply(
            "Welcome! I can help you learn new words. Just send me a word and I will translate it for you."
        );
        try {
            await prisma.user.create({
                data: {
                    id: ctx.from.id,
                    name: ctx.from.first_name + " " + ctx.from.last_name,
                },
            });
        } catch (e) {
            console.log("User already exists");
        }

        const newJob = await scheduleNotification(ctx.from.id, ctx.api);
        crons[ctx.from.id] = newJob;
    });

    bot.on("message", translateAction);
    bot.callbackQuery("save-word", saveWordAction);
    bot.callbackQuery("close_view_word", showLibraryAction);
    bot.callbackQuery("edit_notifications_time", editNotificationsTimeAction);
    bot.callbackQuery(
        "edit_notifications_timezone",
        editNotificationsTimezoneAction
    );
    bot.callbackQuery(
        ["cancel_notifications_time", "cancel_notifications_timezone"],
        notificationsAction
    );
    bot.callbackQuery("save_notifications_time", setUserTimeAction);

    bot.on("callback_query:data", async (ctx, next) => {
        const [key, data] = ctx.callbackQuery.data?.split(":");
        if (key === "change_page") {
            if (ctx.session.currentPage !== Number(data)) {
                ctx.session.currentPage = Number(data);
                await showLibraryAction(ctx);
            }
        }

        if (key === "show-word") {
            ctx.session.currentWordId = Number(data);
            await viewWordAction(ctx);
        }

        if (key === "show_answer") {
            ctx.session.currentWordId = Number(data);
            await showAnswerAction(ctx);
        }

        if (key === "answer") {
            ctx.session.grade = Number(data);
            await saveResultAction(ctx);
        }

        if (key === "delete_word") {
            ctx.session.currentWordId = Number(data);
            await deleteUserWordAction(ctx);
        }

        if (key === "toggle_notifications") {
            ctx.session.notificationsEnabled = Number(data);
            await notificationsToggleAction(ctx);
        }

        if (key === "set_notifications_timezone") {
            ctx.session.timezone = data;
            await setUserTimezoneAction(ctx);
        }

        if (key === "update_notifications_time") {
            ctx.session.time = data;
            await editNotificationsTimeAction(ctx);
        }

        console.log(
            "another callbackQuery happened",
            ctx.callbackQuery.data.length,
            ctx.callbackQuery.data
        );
        await ctx.answerCallbackQuery(); // remove loading animation
        return next();
    });

    bot.catch((err) => {
        const ctx = err.ctx;
        console.error(`Error while handling update ${ctx.update.update_id}:`);
        const e = err.error;
        if (e instanceof GrammyError) {
            console.error("Error in request:", e.description);
        } else if (e instanceof HttpError) {
            console.error("Could not contact Telegram:", e);
        } else {
            console.error("Unknown error:", e);
        }
    });

    const users = await prisma.user.findMany();
    users.forEach(async (user) => {
        const job = await scheduleNotification(user.id, bot.api);
        crons[user.id] = job;
    });

    process.once("SIGINT", () => bot.stop());
    process.once("SIGTERM", () => bot.stop());

    bot.start();
}

main()
    .catch((e) => {
        throw e;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
