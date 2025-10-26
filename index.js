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
  if (incomingMsgLower === "hello" || incomingMsgLower === "start") {
    twiml.message(
      "👋 Welcome to Sendo-SMS! Please choose an option:\n\n" +
      "1️⃣ Balance (To check balance, type: BALANCE)\n\n" +
      "2️⃣ Deposit (Add funds: DEPOSIT CURRENCY AMOUNT, e.g., DEPOSIT USDT-ARB 50)\n\n" +
      "3️⃣ Transfer (Send funds: TRANSFER TO_PHONE_NUMBER CURRENCY AMOUNT, e.g., TRANSFER +521234567890 USDT-ARB 50)\n\n" +
      "4️⃣ Withdraw (Withdraw funds: WITHDRAW CURRENCY AMOUNT, e.g., WITHDRAW USDT-ARB 50)\n\n" +

      "5️⃣ BTC in USD (Check BTC price in USD)\n\n" +
      "6️⃣ ETH to USD (Check ETH price in USD)\n\n" +
      "7️⃣ PYUSD to BTC (Convert PYUSD to BTC)\n\n" +
      "8️⃣ Convert USD to ETH (Convert USD to ETH)\n\n" +
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
        // 1️⃣ Crear usuario principal
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
          const userId = data.data._id;

          // 2️⃣ Crear cuenta Arbitrum
          try {
            await fetch(`https://sendo-sms.vercel.app/api/users/${userId}/arbitrum-account`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            });
          } catch (err) {
            console.error("❌ Error creating Arbitrum account:", err);
          }

          // 3️⃣ Crear cuenta Bitcoin
          try {
            await fetch(`https://sendo-sms.vercel.app/api/users/${userId}/bitcoin-account`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            });
          } catch (err) {
            console.error("❌ Error creating Bitcoin account:", err);
          }

          twiml.message(
            `✅ Registered successfully!\nName: ${name}\nEmail: ${email}\nPhone: ${from}\n` +
            `Your Arbitrum and Bitcoin accounts have been created.`
          );
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
  // DEPOSIT
  else if (incomingMsgLower.startsWith("deposit")) {
    const parts = incomingMsgSMS.split(/\s+/);
    if (parts.length !== 3) {
      twiml.message("❌ Please send in format: DEPOSIT CURRENCY AMOUNT\nExample: DEPOSIT USDT-ARB 50");
    } else {
      const currency = parts[1].toUpperCase();
      const amount = parseFloat(parts[2]);

      if (!["PYUSD-ARB", "USDT-ARB", "SAT-BTC"].includes(currency) || isNaN(amount) || amount <= 0) {
        twiml.message("❌ Invalid currency or amount. Valid currencies: PYUSD-ARB, USDT-ARB, SAT-BTC");
      } else {
        try {
          const response = await fetch(`https://sendo-sms.vercel.app/api/users/${from}/transactions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "deposit",
              currency,
              amount
            })
          });

          const data = await response.json();

          if (data.success) {
            twiml.message(`✅ Deposit successful!\nAmount: ${amount} ${currency}`);
          } else {
            twiml.message(`❌ Could not deposit: ${data.error || "Unknown error"}`);
          }
        } catch (error) {
          console.error(error);
          twiml.message("❌ Error processing deposit. Please try again later.");
        }
      }
    }
  }
  // TRANSFER
  else if (incomingMsgLower.startsWith("transfer")) {
    const parts = incomingMsgSMS.split(/\s+/);
    if (parts.length !== 4) {
      twiml.message("❌ Please send in format: TRANSFER TO_PHONE_NUMBER CURRENCY AMOUNT\nExample: TRANSFER +521234567890 USDT-ARB 50");
    } else {
      const toPhoneNumber = parts[1];
      const currency = parts[2].toUpperCase();
      const amount = parseFloat(parts[3]);

      if (!["PYUSD-ARB", "USDT-ARB", "SAT-BTC"].includes(currency) || isNaN(amount) || amount <= 0) {
        twiml.message("❌ Invalid currency or amount. Valid currencies: PYUSD-ARB, USDT-ARB, SAT-BTC");
      } else {
        try {
          const response = await fetch(`https://sendo-sms.vercel.app/api/users/${from}/transactions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "transfer",
              currency,
              amount,
              toPhoneNumber
            })
          });

          const data = await response.json();

          if (data.success) {
            twiml.message(`✅ Transfer successful!\nAmount: ${amount} ${currency}\nTo: ${toPhoneNumber}`);
          } else {
            twiml.message(`❌ Could not transfer: ${data.error || "Unknown error"}`);
          }
        } catch (error) {
          console.error(error);
          twiml.message("❌ Error processing transfer. Please try again later.");
        }
      }
    }
  }
  // WITHDRAW
  else if (incomingMsgLower.startsWith("withdraw")) {
    const parts = incomingMsgSMS.split(/\s+/);
    if (parts.length !== 3) {
      twiml.message("❌ Please send in format: WITHDRAW CURRENCY AMOUNT\nExample: WITHDRAW USDT-ARB 50");
    } else {
      const currency = parts[1].toUpperCase();
      const amount = parseFloat(parts[2]);

      if (!["PYUSD-ARB", "USDT-ARB", "SAT-BTC"].includes(currency) || isNaN(amount) || amount <= 0) {
        twiml.message("❌ Invalid currency or amount. Valid currencies: PYUSD-ARB, USDT-ARB, SAT-BTC");
      } else {
        try {
          const response = await fetch(`https://sendo-sms.vercel.app/api/users/${from}/transactions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "withdrawal",
              currency,
              amount
            })
          });

          const data = await response.json();

          if (data.success) {
            twiml.message(`✅ Withdraw successful!\nAmount: ${amount} ${currency}`);
          } else {
            twiml.message(`❌ Could not withdraw: ${data.error || "Unknown error"}`);
          }
        } catch (error) {
          console.error(error);
          twiml.message("❌ Error processing withdraw. Please try again later.");
        }
      }
    }
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
