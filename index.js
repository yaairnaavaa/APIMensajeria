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
  const incomingMsgSMS = req.body.Body?.toLowerCase().trim() || "";
  const twiml = new MessagingResponse();

  console.log("📩 Mensaje recibidoSMS:", incomingMsgSMS);

  // MENSAJE DE BIENVENIDA
  if (incomingMsgSMS === "hello" || incomingMsgSMS === "hi") {
    twiml.message(
    "👋 Welcome to Sendo-SMS! Please choose an option:\n\n" +
    "1️⃣ Balance (To check balance, type: BALANCE YOUR_USER_ID)\n" +
    "2️⃣ Transfer (Send money to another user)\n" +
    "3️⃣ Deposit (Add funds to your account)\n" +
    "4️⃣ Withdraw (Withdraw funds from your account)\n" +
    "5️⃣ BTC in USD (Check BTC price in USD)\n" +
    "6️⃣ ETH to USD (Check ETH price in USD)\n" +
    "7️⃣ PYUSD to BTC (Convert PYUSD to BTC)\n" +
    "8️⃣ Convert USD to ETH (Convert USD to ETH)\n" +
    "9️⃣ BTC in Dollars (Check BTC price in USD)"
    );
  } 
  // MENÚ OPCIONES
  else if (incomingMsgSMS === "menu") {
    twiml.message(
    "📋 OPTIONS:\n\n" +
    "1️⃣ Balance (To check balance, type: BALANCE YOUR_USER_ID)\n" +
    "2️⃣ Transfer (Send money to another user)\n" +
    "3️⃣ Deposit (Add funds to your account)\n" +
    "4️⃣ Withdraw (Withdraw funds from your account)\n" +
    "5️⃣ BTC in USD (Check BTC price in USD)\n" +
    "6️⃣ ETH to USD (Check ETH price in USD)\n" +
    "7️⃣ PYUSD to BTC (Convert PYUSD to BTC)\n" +
    "8️⃣ Convert USD to ETH (Convert USD to ETH)\n" +
    "9️⃣ BTC in Dollars (Check BTC price in USD)"
    );
  } 
  // BALANCE CON ID DE USUARIO
  else if (incomingMsgSMS.startsWith("balance")) {
    const parts = incomingMsgSMS.split(" ");
    const userId = parts[1];

    if (!userId) {
      twiml.message("❌ Please provide your user ID. Example: BALANCE 68fd621752b7f9c00e6acccc");
    } else {
      try {
        const response = await fetch(`https://sendo-sms.vercel.app/api/users/${userId}/balances`);
        const data = await response.json();
        twiml.message(`💰 Balance for user ${userId}: ${data.balance} USD`);
      } catch (error) {
        console.error(error);
        twiml.message("❌ Error fetching balance. Please check your user ID.");
      }
    }
  } 
  // TRANSFER
  else if (incomingMsgSMS === "transfer") {
    twiml.message("You chose the TRANSFER option");
  } 
  // DEPOSIT
  else if (incomingMsgSMS === "deposit") {
    twiml.message("You chose the DEPOSIT option");
  } 
  // WITHDRAW
  else if (incomingMsgSMS === "withdraw") {
    twiml.message("You chose the WITHDRAW option");
  } 
  // BTC in USD
  else if (incomingMsgSMS === "btc in usd") {
    twiml.message("You selected 'BTC in USD'");
  } 
  // ETH to USD
  else if (incomingMsgSMS === "eth to usd") {
    twiml.message("You selected 'ETH to USD'");
  } 
  // PYUSD to BTC
  else if (incomingMsgSMS === "pyusd to btc") {
    twiml.message("You selected 'PYUSD to BTC'");
  } 
  // Convert USD to ETH
  else if (incomingMsgSMS === "convert usd to eth") {
    twiml.message("You selected 'Convert USD to ETH'");
  } 
  // BTC in Dollars
  else if (incomingMsgSMS === "btc in dollars") {
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
