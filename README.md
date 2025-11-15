# 📋 Inscripts Assignment — Trello Realtime Dashboard

This project is a Trello-like realtime dashboard built using:

**Next.js (App Router)** – UI  
**Express.js Backend**  
**Socket.IO** – real-time sync  
**Trello API** – task management  
**Trello Webhooks** – live updates from Trello  
**Drag & Drop** – Move cards between lists (saved to Trello)

You can create boards, lists, cards, edit them, delete them, and everything updates in real-time across all open clients.

---

## 🚀 Features

✔ Create, update, delete Trello cards  
✔ Drag & drop cards between lists  
✔ Realtime updates via Socket.IO  
✔ Webhook syncing whenever a Trello card is changed directly on trello.com  
✔ Automatic UI updates (no refresh needed)  
✔ Sync board, list, and card states  
✔ Node.js backend with secure Trello API integration

---

## 📂 Project Structure

```
inscripts/
│
├── backend/
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
│   ├── app/
│   ├── public/
│   ├── next.config.ts
│   ├── next-env.d.ts
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── postcss.config.mjs
│   └── eslint.config.mjs
│
├── postman/
│   └── inscripts.postman_collection.json
│
└── README.md

```

---

## 🛠️ Installation & Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/<your-username>/trello-dashboard.git
cd trello-dashboard
```

---

## 🔑 Trello API Setup (Required)

To use Trello's API, get your API Key and Token.

### Step 1 — Get Trello API Key

Go to:

👉 **https://trello.com/app-key**

Copy:
- API Key
- Scroll down → click Token → generate a Token

---

## 🌍 Enabling Real-Time Trello Webhooks

*(This makes changes on trello.com update your app)*

Trello cannot call localhost:5001, so you MUST expose it with ngrok.

### Step 1 — Start ngrok

Run:

```bash
ngrok http 5001
```

You will get an output like:

```
Forwarding  https://abcd1234.ngrok-free.app -> http://localhost:5001
```

📋 Copy the HTTPS URL (e.g. `https://abcd1234.ngrok-free.app`)

### Step 2 — Register the webhook with Trello

You can use Postman or curl.

**POST request to:**
```
https://api.trello.com/1/webhooks/
```

**Body (JSON):**
```json
{
  "key": "YOUR_API_KEY",
  "token": "YOUR_API_TOKEN",
  "callbackURL": "https://abcd1234.ngrok-free.app/webhook/trello",
  "idModel": "YOUR_BOARD_ID",
  "description": "Realtime Trello Sync"
}
```

💡 **How to find your board ID?**

Open your Trello board in browser:

```
https://trello.com/b/BOARD_ID/anything
```

`BOARD_ID` is the long string in the URL.

### Step 3 — Using Curl (Alternative)

Replace your variables:

```bash
curl -X POST \
"https://api.trello.com/1/webhooks/?key=YOUR_KEY&token=YOUR_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "callbackURL": "https://abcd1234.ngrok-free.app/webhook/trello",
  "idModel": "YOUR_BOARD_ID",
  "description": "rt"
}'
```

✅ If successful, you get:

```json
{
  "id": "xxxxx",
  "description": "rt",
  "callbackURL": "https://abcd1234.ngrok-free.app/webhook/trello",
  "active": true
}
```

---

## 🧾 Conclusion

This project demonstrates a complete, production-grade integration between a custom Trello-style dashboard and the official Trello API — including full real-time synchronization using WebSockets and Trello Webhooks.

### You now have:

✔ A fully working frontend built with Next.js  
✔ A robust backend with Express.js + Socket.IO  
✔ Drag & Drop functionality fully synced with Trello  
✔ Real-time updates across all connected clients  
✔ Instant UI reflection of changes made on trello.com  
✔ A clean architecture ready for expansion or deployment

### The system ensures perfect two-way syncing:

```
Your UI → Backend → Trello → Webhook → All Clients

Trello → Webhook → Backend → All Clients
```

This makes the dashboard behave almost exactly like Trello itself, with your own customized interface and real-time collaboration built in.