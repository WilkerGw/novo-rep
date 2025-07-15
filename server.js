const express = require("express");
const admin = require("firebase-admin");
const { z } = require("zod");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());

const corsOptions = {
  origin: process.env.FRONTEND_URL,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

try {
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  
  if (!serviceAccountString) {
    throw new Error("A variável de ambiente FIREBASE_SERVICE_ACCOUNT_JSON não foi encontrada ou está vazia.");
  }

  const serviceAccount = JSON.parse(serviceAccountString);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });

  console.log("Firebase Admin SDK inicializado com sucesso a partir da variável de ambiente!");

} catch (error) {
  console.error(
    "ERRO CRÍTICO AO INICIALIZAR O FIREBASE ADMIN SDK:",
    error.message
  );
  process.exit(1);
}

const db = admin.firestore();

const agendamentoSchema = z.object({
    nomeCompleto: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
    telefone: z.string().min(10, "O telefone deve ter pelo menos 10 dígitos."),
    dataNascimento: z.string().date("Insira uma data de nascimento válida."),
    horario: z.string(),
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
            message: "Agendamento solicitado com sucesso!",
            agendamentoId: docRef.id,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.warn("Falha na validação dos dados:", error.flatten().fieldErrors);
            return res.status(400).json({ error: "Dados inválidos.", details: error.flatten().fieldErrors });
        }
        console.error("Erro interno do servidor:", error);
        return res.status(500).json({ error: "Ocorreu um erro interno." });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor backend rodando na porta ${PORT}`);
});