import { InlineKeyboard } from "grammy";
import { prisma } from "./utils/prisma";
import { renderTranslation } from "./utils/renderer";

const PAGINATION_SIZE = 3;

const createPaginationChoices = (totalPages, currentPage) => {
    const totalPagesFixed = Math.ceil(totalPages);
    const currentPageFinite =
        typeof currentPage === "number" && Number.isFinite(currentPage)
            ? currentPage
            : 1;
    const currentPageFixed = Math.max(
        1,
        Math.min(totalPagesFixed, Math.floor(currentPageFinite))
    );

    const buttons = {};
    if (
        !Number.isFinite(totalPagesFixed) ||
        !Number.isFinite(currentPageFixed) ||
        totalPagesFixed < 2
    ) {
        return buttons;
    }

    const before = currentPageFixed - 1;
    const after = currentPageFixed + 1;

    if (currentPageFixed > 1) {
        if (before > 1) {
            buttons[1] = "1 ⏪";
        }

        buttons[before] = `${before} ◀️`;
    }

    buttons[currentPageFixed] = String(currentPageFixed);

    if (currentPageFixed < totalPagesFixed) {
        buttons[after] = `▶️ ${after}`;

        if (after < totalPagesFixed) {
            buttons[totalPagesFixed] = `⏩ ${totalPagesFixed}`;
        }
    }

    return buttons;
};

export const showLibraryAction = async (ctx) => {
    const currentPage = ctx.session.currentPage;

    const totalCount = await prisma.userWord.count();

    const library = await prisma.userWord.findMany({
        where: { userId: ctx.from.id },
        include: { word: true },
        skip: (currentPage - 1) * PAGINATION_SIZE,
        take: PAGINATION_SIZE,
    });

    const inlineKeyboard = new InlineKeyboard();
    library.forEach((item) => {
        inlineKeyboard.text(item.word.value, `show-word:${item.word.id}`).row();
    });

    const pages = Math.ceil(totalCount / PAGINATION_SIZE);

    const buttons = createPaginationChoices(pages, currentPage);

    Object.keys(buttons).forEach((page) => {
        inlineKeyboard.text(buttons[page], `change_page:${page}`);
    });

    try {
        await ctx.editMessageText("Your saved words", {
            reply_markup: inlineKeyboard,
        });
    } catch (e) {
        await ctx.reply("Your saved words", {
            reply_markup: inlineKeyboard,
        });
    }
};

export const viewWordAction = async (ctx) => {
    const word = await prisma.word.findUnique({
        where: {
            id: ctx.session.currentWordId,
        },
    });
    word.examples = JSON.parse(word.examples);
    word.translations = JSON.parse(word.translations);

    const inlineKeyboard = new InlineKeyboard();
    inlineKeyboard
        .text("Delete  ❌", `delete_word:${word.id}`)
        .text("Listen", `audio:${word.value}`)
        .text("Go back", "close_view_word");

    await ctx.editMessageText(renderTranslation(word), {
        parse_mode: "HTML",
        reply_markup: inlineKeyboard,
    });
};

export const deleteUserWordAction = async (ctx) => {
    const userWord = await prisma.userWord.findFirst({
        where: {
            userId: ctx.from.id,
            wordId: ctx.session.currentWordId,
        },
    });

    const deleteResults = prisma.result.deleteMany({
        where: {
            userWordId: userWord.id,
        },
    });

    const deleteUserWord = prisma.userWord.deleteMany({
        where: {
            id: userWord.id,
        },
    });

    await prisma.$transaction([deleteResults, deleteUserWord]);

    await ctx.answerCallbackQuery({
        text: "Удалено из библиотеки",
    });

    await showLibraryAction(ctx);
};
