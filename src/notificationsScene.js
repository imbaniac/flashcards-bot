import { InlineKeyboard } from "grammy";
import { crons, scheduleNotification } from "./utils/cron";
import { prisma } from "./utils/prisma";
import { MINIMAL_TIMEZONE_SET } from "./utils/time";

export const notificationsAction = async (ctx) => {
    const user = await prisma.user.findUnique({
        where: { id: ctx.from.id },
    });

    const text = user.notificationsEnabled
        ? "🔕 Disable notifications"
        : "🔔 Enable notifications";

    const userTimezone = MINIMAL_TIMEZONE_SET.find(
        (tz) => tz.offset === user.timezoneOffset
    );

    ctx.session.time = user.time.replace(":", "|");

    const inlineKeyboard = new InlineKeyboard()
        .text(`Time: ${user.time}`, `edit_notifications_time`)
        .row()
        .text(
            `Timezone: ${userTimezone?.label || MINIMAL_TIMEZONE_SET[0].label}`,
            "edit_notifications_timezone"
        )
        .row()
        .text(text, `toggle_notifications:${user.notificationsEnabled ? 0 : 1}`)
        .row();

    try {
        await ctx.editMessageText("Your notifications setting", {
            reply_markup: inlineKeyboard,
        });
    } catch (e) {
        await ctx.reply("Your notifications setting", {
            reply_markup: inlineKeyboard,
        });
    }
};

export const notificationsToggleAction = async (ctx) => {
    await prisma.user.update({
        where: { id: ctx.from.id },
        data: {
            notificationsEnabled: Boolean(ctx.session.notificationsEnabled),
        },
    });

    await notificationsAction(ctx);

    await ctx.answerCallbackQuery({
        text: `Notifications ${
            ctx.session.notificationsEnabled ? "enabled" : "disabled"
        }`,
    });
};

export const editNotificationsTimeAction = async (ctx) => {
    const user = await prisma.user.findUnique({
        where: { id: ctx.from.id },
    });

    const time = ctx.session.time || user.time.replace(":", "|");

    const [hours, minutes] = time.split("/").map(Number);

    const inlineKeyboard = new InlineKeyboard();

    inlineKeyboard.text(
        "<",
        `update_notifications_time:${hours > 0 ? hours - 1 : 23}/${minutes}`
    );
    inlineKeyboard.text(String(hours).padStart(2, "0"));
    inlineKeyboard.text(
        ">",
        `update_notifications_time:${hours < 23 ? hours + 1 : 0}/${minutes}`
    );
    inlineKeyboard.row();

    inlineKeyboard.text(
        "<",
        `update_notifications_time:${hours}/${minutes > 0 ? minutes - 1 : 59}`
    );
    inlineKeyboard.text(String(minutes).padStart(2, "0"));
    inlineKeyboard.text(
        ">",
        `update_notifications_time:${hours}/${minutes < 59 ? minutes + 1 : 0}`
    );
    inlineKeyboard.row();

    inlineKeyboard.text("Cancel", "cancel_notifications_time");
    inlineKeyboard.text("Save", "save_notifications_time");

    try {
        await ctx.editMessageText("Set notifications time", {
            reply_markup: inlineKeyboard,
        });
    } catch (e) {
        await ctx.reply("Set notifications time", {
            reply_markup: inlineKeyboard,
        });
    }
};

export const editNotificationsTimezoneAction = async (ctx) => {
    const inlineKeyboard = new InlineKeyboard();
    MINIMAL_TIMEZONE_SET.forEach((timezoneOffset, i) => {
        inlineKeyboard.text(
            timezoneOffset.label,
            `set_notifications_timezone:${timezoneOffset.offset.replace(
                ":",
                "|"
            )}`
        );
        if (i % 2 === 0) {
            inlineKeyboard.row();
        }
    });

    inlineKeyboard.text("Cancel", "cancel_notifications_timezone");

    await ctx.editMessageReplyMarkup({ reply_markup: inlineKeyboard });
};

export const setUserTimezoneAction = async (ctx) => {
    await prisma.user.update({
        where: { id: ctx.from.id },
        data: {
            timezoneOffset: ctx.session.timezone.replace("|", ":"),
        },
    });

    crons[ctx.from.id]?.stop();
    const job = await scheduleNotification(ctx.from.id, ctx.api);
    crons[ctx.from.id] = job;

    await notificationsAction(ctx);

    await ctx.answerCallbackQuery({
        text: `Timezone set to ${ctx.session.timezone.replace("|", ":")}`,
    });
};

export const setUserTimeAction = async (ctx) => {
    const [hours, minutes] = ctx.session.time.split("/");

    const time = `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;

    await prisma.user.update({
        where: { id: ctx.from.id },
        data: {
            time,
        },
    });

    crons[ctx.from.id]?.stop();
    const job = await scheduleNotification(ctx.from.id, ctx.api);
    crons[ctx.from.id] = job;

    await notificationsAction(ctx);

    await ctx.answerCallbackQuery({
        text: `Notifications time set to ${time}`,
    });
};
