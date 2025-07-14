const express = require("express");
const admin = require("firebase-admin");
const { z } = require("zod");
const cors = require("cors");
require("dotenv").config();
const path = require("path"); 

const app = express();
app.use(express.json());

const corsOptions = {
  origin: process.env.FRONTEND_URL,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));


try {
  const serviceAccountPath = path.join(__dirname, process.env.GOOGLE_APPLICATION_CREDENTIALS);
  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
  console.log("Firebase Admin SDK inicializado com sucesso.");
} catch (error) {
  console.error(
    "Erro ao inicializar o Firebase Admin SDK:",
    error.message,
    "\nCertifique-se de que o arquivo de chave existe e que as variáveis de ambiente no Render estão corretas."
  );
  process.exit(1);
}

const db = admin.firestore();

const agendamentoSchema = z.object({
  nomeCompleto: z
    .string({ required_error: "O nome completo é obrigatório." })
    .min(3, { message: "O nome deve ter pelo menos 3 caracteres." }),
  telefone: z
    .string({ required_error: "O telefone é obrigatório." })
    .min(10, { message: "O telefone parece curto demais." }),
  dataNascimento: z.string({ required_error: "A data de nascimento é obrigatória." }).date(),
  horario: z.string({ required_error: "O horário é obrigatório." }),
});

app.post("/api/agendamento", async (req, res) => {
  try {
    const agendamentoData = agendamentoSchema.parse(req.body);

    const dataCompleta = {
      ...agendamentoData,
      dataExame: "2025-07-19",
      status: "Pendente",
      criadoEm: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("agendamentos").add(dataCompleta);

    console.log("Agendamento salvo com sucesso. ID:", docRef.id);
    return res.status(201).json({
      message: "Agendamento solicitado com sucesso! Aguarde nossa confirmação.",
      agendamentoId: docRef.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Erro de validação:", error.errors);
      return res.status(400).json({
        error: "Dados inválidos.",
        details: error.flatten().fieldErrors,
      });
    }
    console.error("Erro no servidor ao criar agendamento:", error);
    return res
      .status(500)
      .json({ error: "Ocorreu um erro interno. Tente novamente." });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor backend rodando na porta ${PORT}`);
  if (process.env.FRONTEND_URL) {
    console.log(`Permitindo requisições do frontend em: ${process.env.FRONTEND_URL}`);
  }
});