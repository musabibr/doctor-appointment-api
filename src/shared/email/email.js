const path = require("path");
const pug = require("pug");
const sendgrid = require("@sendgrid/mail");
const { convert } = require("html-to-text");
const env = require("../config/env");
const logger = require("../utils/logger");

if (env.useSendgrid) sendgrid.setApiKey(env.SENDGRID_API_KEY);

const VIEWS_DIR = path.join(__dirname, "templates");

// In tests, emails are collected here instead of being sent.
const outbox = [];

// In demo mode, emails are never sent: the newest ones are kept here and shown
// in the web app's "Demo inbox" so testers can read codes and links.
const DEMO_INBOX_SIZE = 50;
const demoInbox = [];
let demoEmailId = 0;

const recentDemoEmails = ({ to } = {}) => {
    const filter = String(to || "").trim().toLowerCase();
    return filter ? demoInbox.filter((email) => email.to.toLowerCase().includes(filter)) : [...demoInbox];
};

const clearDemoInbox = () => {
    demoInbox.length = 0;
};

const firstNameOf = (name = "") => String(name).trim().split(/\s+/)[0] || "there";

const render = (template, locals) => {
    const html = pug.renderFile(path.join(VIEWS_DIR, `${template}.pug`), {
        appName: env.APP_NAME,
        ...locals,
    });
    const text = convert(html, {
        wordwrap: 100,
        selectors: [
            { selector: "style", format: "skip" },
            { selector: "title", format: "skip" },
            { selector: "table", format: "block" },
            { selector: "a", options: { hideLinkHrefIfSameAsText: true } },
        ],
    });
    return { html, text: text.replace(/\n{3,}/g, "\n\n").trim() };
};

const send = async ({ to, subject, template, locals = {} }) => {
    const { html, text } = render(template, { subject, ...locals });

    if (env.DEMO_MODE) {
        demoInbox.unshift({ id: ++demoEmailId, to, subject, text, sentAt: new Date().toISOString() });
        demoInbox.length = Math.min(demoInbox.length, DEMO_INBOX_SIZE);
    }

    if (env.isTest) {
        outbox.push({ to, subject, template, locals, text });
        return;
    }

    if (env.DEMO_MODE) {
        logger.info(`Demo email to ${to}: "${subject}" (read it in the web app's Demo inbox)`);
        return;
    }

    if (!env.useSendgrid) {
        logger.info(
            `\n========== EMAIL (printed because SENDGRID_API_KEY / EMAIL_FROM are not set) ==========\n` +
                `To: ${to}\nSubject: ${subject}\n\n${text}\n` +
                `=======================================================================================`
        );
        return;
    }

    await sendgrid.send({ from: `${env.APP_NAME} <${env.EMAIL_FROM}>`, to, subject, html, text });
};

// Email problems must never break the request that triggered them.
const sendSafely = async (message) => {
    try {
        await send(message);
        return true;
    } catch (error) {
        logger.error(`Failed to send "${message.subject}" to ${message.to}: ${error.message}`);
        return false;
    }
};

const sendOtp = (user, code) =>
    sendSafely({
        to: user.email,
        subject: `Your ${env.APP_NAME} verification code`,
        template: "otp",
        locals: { firstName: firstNameOf(user.name), code },
    });

const sendPasswordReset = (user, url) =>
    sendSafely({
        to: user.email,
        subject: "Reset your password (valid for 30 minutes)",
        template: "passwordReset",
        locals: { firstName: firstNameOf(user.name), url },
    });

const sendWelcome = (user, url) =>
    sendSafely({
        to: user.email,
        subject: `Welcome to ${env.APP_NAME}!`,
        template: "welcome",
        locals: { firstName: firstNameOf(user.name), url },
    });

const sendNotification = (user, { subject, lines = [], actionUrl, actionLabel }) =>
    sendSafely({
        to: user.email,
        subject,
        template: "notification",
        locals: { firstName: firstNameOf(user.name), lines, actionUrl, actionLabel },
    });

module.exports = { sendOtp, sendPasswordReset, sendWelcome, sendNotification, outbox, recentDemoEmails, clearDemoInbox };
