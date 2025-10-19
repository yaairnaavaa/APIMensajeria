import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import twilio from "twilio";
import pkg from "twilio/lib/twiml/MessagingResponse.js";
const { MessagingResponse } = pkg;

dotenv.config();
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Configurar cliente Twilio
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * 📨 ENDPOINT PARA RECIBIR MENSAJES SMS
 * Twilio enviará aquí los mensajes entrantes
 */
app.post("/sms", (req, res) => {
  const incomingMsg = req.body.Body?.toLowerCase().trim() || "";
  const twiml = new MessagingResponse();

  console.log("📩 Mensaje recibido:", incomingMsg);

  if (incomingMsg === "hola") {
    twiml.message("👋 ¡Hola! Escribe 'MENU' para ver opciones disponibles.");
  } else if (incomingMsg === "menu") {
    twiml.message("📋 Opciones:\n1️⃣ STATUS\n2️⃣ AGENDAR\n3️⃣ CANCELAR");
  } else if (incomingMsg === "status") {
    twiml.message("📦 Tu pedido está en camino 🚚");
  } else {
    twiml.message("❓ Comando no reconocido. Escribe 'MENU' para ver opciones.");
  }

  res.type("text/xml").send(twiml.toString());
});

/**
 * 🚀 ENDPOINT PARA ENVIAR MENSAJE DE PRUEBA
 * Puedes hacer un POST a /send con un JSON como:
 * { "to": "+521XXXXXXXXXX", "body": "Hola desde mi servidor!" }
 */
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
