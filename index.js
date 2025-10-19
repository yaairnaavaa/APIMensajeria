import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import twilio from "twilio";
import morgan from 'morgan';
const { MessagingResponse } = twilio.twiml;


dotenv.config();
const app = express();
app.use(morgan('dev')); // Utiliza el formato de registro 'dev'
app.use(express.json()); // Analiza el cuerpo de las solicitudes en formato JSON
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Configurar cliente Twilio
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

app.get("/", (req, res) => {
  res.send("Bienvenido a la API de Twilio");
});

/**
 * 📨 ENDPOINT PARA RECIBIR MENSAJES SMS
 * Twilio enviará aquí los mensajes entrantes
 */
app.get("/sms", (req, res) => {
  res.send("✅ Endpoint /sms activo, pero recuerda que Twilio usa POST");
});

app.post("/sms", (req, res) => {
  const incomingMsg = req.body.msg?.toLowerCase().trim() || "";
  const twiml = new MessagingResponse();

  console.log("📩 Mensaje recibido:", incomingMsg);

  if (incomingMsg === "hello") {
    twiml.message("👋 Hello! Type 'MENU' to see available options.");
  } else if (incomingMsg === "menu") {
    twiml.message("📋 OPTIONS:\n1️⃣ BALANCE\n2️⃣ TRANSFER\n3️⃣ SWAP");
  } else if (incomingMsg === "balance") {
    twiml.message("You chose the BALANCE option");
  } else if (incomingMsg === "transfer") {
    twiml.message("You chose the TRANSFER option");
  } else if (incomingMsg === "swap") {
    twiml.message("You chose the SWAP option");
  } else {
    twiml.message("❓ Command not recognized. Type 'MENU' to see options.");
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
