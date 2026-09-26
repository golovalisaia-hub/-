import hashlib
import logging
import os

import requests
from flask import Flask, jsonify, request

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger("sales-bot")

app = Flask(__name__)

BOT_TOKEN = os.getenv("BOT_TOKEN", "").strip()
SELLER_USERNAME = os.getenv("SELLER_USERNAME", "").strip().lstrip("@")
PUBLIC_URL = os.getenv("PUBLIC_URL", "").strip().rstrip("/")

API_BASE = f"https://api.telegram.org/bot{BOT_TOKEN}" if BOT_TOKEN else ""

TOKEN_HASH = hashlib.sha256(BOT_TOKEN.encode()).hexdigest() if BOT_TOKEN else "not-configured"
WEBHOOK_PATH = f"/telegram/{TOKEN_HASH[:32]}"
WEBHOOK_SECRET = TOKEN_HASH[32:80]

START_TEXT = """
<b>🐍 Python + 🇬🇧 English</b>

Готовый учебный сайт для изучения <b>Python</b> — от самых основ к продвинутым темам.

🎁 <b>Сайт для изучения английского — в подарок</b>
💳 Стоимость комплекта: <b>299 ₽</b>

Посмотри, что входит, или сразу свяжись со мной 👇
""".strip()

DETAILS_TEXT = """
<b>📚 Что входит в комплект</b>

🐍 <b>Python</b>
• обучение по шагам;
• темы от базовых к более сложным;
• удобная структура обучения;
• прогресс и последовательный маршрут.

🇬🇧 <b>English — в подарок</b>
• отдельный сайт для английского;
• обучение с нуля;
• последовательные темы и практика.

💳 Всё вместе — <b>299 ₽</b>.

Если хочешь приобрести комплект, нажми кнопку ниже 👇
""".strip()

BUY_TEXT = """
<b>💎 Купить комплект — 299 ₽</b>

Нажми <b>«Написать продавцу»</b> ниже — Telegram сразу откроет мой профиль.

Напиши, что хочешь приобрести комплект <b>Python + English</b>, и я отвечу тебе лично 👇
""".strip()


def seller_url() -> str:
    return f"https://t.me/{SELLER_USERNAME}"


def start_keyboard():
    return {
        "inline_keyboard": [
            [{"text": "📚 Что входит?", "callback_data": "details"}],
            [{"text": "💎 Купить за 299 ₽", "callback_data": "buy"}],
            [{"text": "💬 Написать продавцу", "url": seller_url()}],
        ]
    }


def details_keyboard():
    return {
        "inline_keyboard": [
            [{"text": "💎 Купить за 299 ₽", "callback_data": "buy"}],
            [{"text": "💬 Написать продавцу", "url": seller_url()}],
            [{"text": "⬅️ Назад", "callback_data": "home"}],
        ]
    }


def buy_keyboard():
    return {
        "inline_keyboard": [
            [{"text": "💬 Написать продавцу", "url": seller_url()}],
            [{"text": "📚 Что входит?", "callback_data": "details"}],
            [{"text": "⬅️ Назад", "callback_data": "home"}],
        ]
    }


def telegram(method: str, payload: dict | None = None, timeout: int = 15):
    if not BOT_TOKEN:
        raise RuntimeError("BOT_TOKEN is not configured")

    response = requests.post(
        f"{API_BASE}/{method}",
        json=payload or {},
        timeout=timeout,
    )
    response.raise_for_status()
    data = response.json()

    if not data.get("ok"):
        raise RuntimeError(f"Telegram API error: {data}")

    return data.get("result")


def send_start(chat_id: int):
    return telegram(
        "sendMessage",
        {
            "chat_id": chat_id,
            "text": START_TEXT,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
            "reply_markup": start_keyboard(),
        },
    )


def edit_screen(chat_id: int, message_id: int, text: str, keyboard: dict):
    return telegram(
        "editMessageText",
        {
            "chat_id": chat_id,
            "message_id": message_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
            "reply_markup": keyboard,
        },
    )


def answer_callback(callback_query_id: str):
    try:
        telegram(
            "answerCallbackQuery",
            {"callback_query_id": callback_query_id},
            timeout=10,
        )
    except Exception:
        log.exception("Could not answer callback query")


def process_update(update: dict):
    message = update.get("message")
    if message:
        chat = message.get("chat", {})
        if chat.get("type") != "private":
            return

        text = (message.get("text") or "").strip().lower()
        if (
            text == "/start"
            or text.startswith("/start ")
            or text in {"start", "старт", "начать"}
        ):
            send_start(chat["id"])
        return

    callback = update.get("callback_query")
    if not callback:
        return

    callback_id = callback.get("id")
    if callback_id:
        answer_callback(callback_id)

    data = callback.get("data", "")
    callback_message = callback.get("message") or {}
    chat = callback_message.get("chat") or {}
    chat_id = chat.get("id")
    message_id = callback_message.get("message_id")

    if not chat_id or not message_id:
        return

    if data == "home":
        edit_screen(chat_id, message_id, START_TEXT, start_keyboard())
    elif data == "details":
        edit_screen(chat_id, message_id, DETAILS_TEXT, details_keyboard())
    elif data == "buy":
        edit_screen(chat_id, message_id, BUY_TEXT, buy_keyboard())


def configure_webhook() -> bool:
    if not BOT_TOKEN or not SELLER_USERNAME or not PUBLIC_URL:
        log.info("Webhook not configured yet: waiting for BOT_TOKEN, SELLER_USERNAME and PUBLIC_URL.")
        return False

    webhook_url = f"{PUBLIC_URL}{WEBHOOK_PATH}"

    try:
        result = telegram(
            "setWebhook",
            {
                "url": webhook_url,
                "secret_token": WEBHOOK_SECRET,
                "allowed_updates": ["message", "callback_query"],
                "drop_pending_updates": False,
                "max_connections": 10,
            },
        )
        log.info("Telegram webhook configured: %s", webhook_url)
        return bool(result)
    except Exception:
        log.exception("Failed to configure Telegram webhook")
        return False


@app.get("/")
def index():
    return jsonify(
        {
            "ok": True,
            "service": "python-english-sales-bot",
            "configured": bool(BOT_TOKEN and SELLER_USERNAME and PUBLIC_URL),
        }
    )


@app.get("/health")
def health():
    configured = bool(BOT_TOKEN and SELLER_USERNAME and PUBLIC_URL)
    return jsonify({"ok": True, "configured": configured}), 200


@app.post(WEBHOOK_PATH)
def telegram_webhook():
    if not BOT_TOKEN or not SELLER_USERNAME:
        return jsonify({"ok": False, "error": "Bot is not configured"}), 503

    incoming_secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    if incoming_secret != WEBHOOK_SECRET:
        return jsonify({"ok": False}), 403

    update = request.get_json(silent=True)
    if not isinstance(update, dict):
        return jsonify({"ok": False}), 400

    try:
        process_update(update)
    except Exception:
        log.exception("Failed to process Telegram update")

    return jsonify({"ok": True})


configure_webhook()

if __name__ == "__main__":
    port = int(os.getenv("PORT", "10000"))
    app.run(host="0.0.0.0", port=port)
