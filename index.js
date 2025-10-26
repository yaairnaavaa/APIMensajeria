import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import twilio from "twilio";
import morgan from 'morgan';
import fetch from "node-fetch"; // npm install node-fetch
const { MessagingResponse } = twilio.twiml;

dotenv.config();
const app = express();
app.use(morgan('dev'));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Configurar cliente Twilio
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

app.get("/", (req, res) => {
  res.send("Bienvenido a la API de Twilio");
});

app.get("/sms", (req, res) => {
  res.send("✅ Endpoint /sms activo, pero recuerda que Twilio usa POST");
});

app.post("/sms", async (req, res) => {
  const from = req.body.From || "";
  const incomingMsgSMS = req.body.Body?.trim() || "";
  const incomingMsgLower = incomingMsgSMS.toLowerCase();
  const twiml = new MessagingResponse();

  console.log("📩 From:", from);
  console.log("📩 Body:", incomingMsgSMS);

  // MENSAJE DE BIENVENIDA
  if (incomingMsgLower === "hello" || incomingMsgLower === "hi") {
    twiml.message(
      "👋 Welcome to Sendo-SMS! Please choose an option:\n\n" +
      "1️⃣ Balance (To check balance, type: BALANCE)\n" +
      "2️⃣ Transfer (Send money to another user)\n" +
      "3️⃣ Deposit (Add funds to your account)\n" +
      "4️⃣ Withdraw (Withdraw funds from your account)\n" +
      "5️⃣ BTC in USD (Check BTC price in USD)\n" +
      "6️⃣ ETH to USD (Check ETH price in USD)\n" +
      "7️⃣ PYUSD to BTC (Convert PYUSD to BTC)\n" +
      "8️⃣ Convert USD to ETH (Convert USD to ETH)\n" +
      "9️⃣ BTC in Dollars (Check BTC price in USD)\n\n" +
      "To register, type: REGISTER Name Email@example.com"
    );
  }
  // MENÚ OPCIONES
  else if (incomingMsgLower === "menu") {
    twiml.message(
      "📋 OPTIONS:\n\n" +
      "1️⃣ Balance (To check balance, type: BALANCE)\n" +
      "2️⃣ Transfer (Send money to another user)\n" +
      "3️⃣ Deposit (Add funds to your account)\n" +
      "4️⃣ Withdraw (Withdraw funds from your account)\n" +
      "5️⃣ BTC in USD (Check BTC price in USD)\n" +
      "6️⃣ ETH to USD (Check ETH price in USD)\n" +
      "7️⃣ PYUSD to BTC (Convert PYUSD to BTC)\n" +
      "8️⃣ Convert USD to ETH (Convert USD to ETH)\n" +
      "9️⃣ BTC in Dollars (Check BTC price in USD)\n\n" +
      "To register, type: REGISTER Name Email@example.com"
    );
  }
  // REGISTRO DE USUARIO
  else if (incomingMsgLower.startsWith("register")) {
    const parts = incomingMsgSMS.split(/\s+/);
    if (parts.length < 3) {
      twiml.message("❌ Please send in format: REGISTER Name Email@example.com");
    } else {
      const email = parts[parts.length - 1]; // última palabra
      const name = parts.slice(1, parts.length - 1).join(" "); // todas las palabras entre REGISTER y email

      try {
        const response = await fetch("https://sendo-sms.vercel.app/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phoneNumber: from,
            name,
            email
          }),
        });

        const data = await response.json();

        if (data.success) {
          twiml.message(`✅ Registered successfully!\nName: ${name}\nEmail: ${email}\nPhone: ${from}`);
        } else {
          twiml.message(`❌ Could not register: ${data.error || "Unknown error"}`);
        }
      } catch (error) {
        console.error(error);
        twiml.message("❌ Error registering. Please try again later.");
      }
    }
  }
  // BALANCE CON ID DE USUARIO
  else if (incomingMsgLower.startsWith("balance")) {
    try {
      const response = await fetch(`https://sendo-sms.vercel.app/api/users/${from}/balances`);
      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        let message = `💰 Balance for user ${from}:\n`;
        data.data.forEach(item => {
          message += `- ${item.currency}: ${item.amount}\n`;
        });
        twiml.message(message);
      } else {
        twiml.message(
          "❌ Account not found. Please register first by sending: REGISTER Name Email@example.com"
        );
      }
    } catch (error) {
      console.error(error);
      twiml.message(
        "❌ Error fetching balance. Please ensure your account exists or register first: REGISTER Name Email@example.com"
      );
    }
  }
  // TRANSFER
  else if (incomingMsgLower === "transfer") {
    twiml.message("You chose the TRANSFER option");
  }
  // DEPOSIT
  else if (incomingMsgLower === "deposit") {
    twiml.message("You chose the DEPOSIT option");
  }
  // WITHDRAW
  else if (incomingMsgLower === "withdraw") {
    twiml.message("You chose the WITHDRAW option");
  }
  // BTC in USD
  else if (incomingMsgLower === "btc in usd") {
    twiml.message("You selected 'BTC in USD'");
  }
  // ETH to USD
  else if (incomingMsgLower === "eth to usd") {
    twiml.message("You selected 'ETH to USD'");
  }
  // PYUSD to BTC
  else if (incomingMsgLower === "pyusd to btc") {
    twiml.message("You selected 'PYUSD to BTC'");
  }
  // Convert USD to ETH
  else if (incomingMsgLower === "convert usd to eth") {
    twiml.message("You selected 'Convert USD to ETH'");
  }
  // BTC in Dollars
  else if (incomingMsgLower === "btc in dollars") {
    twiml.message("You selected 'BTC in Dollars'");
  }
  // COMANDO NO RECONOCIDO
  else {
    twiml.message("❓ Command not recognized. Type 'MENU' to see available options.");
  }

  res.type("text/xml").send(twiml.toString());
});

// ENDPOINT PARA ENVIAR MENSAJE MANUAL
app.post("/send", async (req, res) => {
  try {
    const { to, body } = req.body;

    if (!to || !body) {
      return res.status(400).json({ error: "Faltan campos: to y body son requeridos." });
    }

    const message = await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });

    console.log("✅ Mensaje enviado:", message.sid);
    res.json({ success: true, sid: message.sid });
  } catch (err) {
    console.error("❌ Error al enviar SMS:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("🚀 Servidor corriendo en http://localhost:3000"));
