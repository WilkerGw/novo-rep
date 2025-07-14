const express = require("express");
const admin = require("firebase-admin");
const { z } = require("zod");
const cors = require("cors");
const path = require("path"); 
require("dotenv").config(); 


console.log(`[DEPURAÇÃO] Diretório de execução do script (__dirname): ${__dirname}`);
console.log(`[DEPURAÇÃO] Valor da variável GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);

const app = express();
app.use(express.json()); 

const corsOptions = {
  origin: process.env.FRONTEND_URL,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

try {
  
  const serviceAccountPath = path.resolve(__dirname, process.env.GOOGLE_APPLICATION_CREDENTIALS);

  console.log(`[DEPURAÇÃO] Tentando carregar a chave do Firebase de: ${serviceAccountPath}`);
  
  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });

  console.log("Firebase Admin SDK inicializado com sucesso.");
} catch (error) {
  console.error(
    "ERRO CRÍTICO AO INICIALIZAR O FIREBASE ADMIN SDK:",
    error.message
  );
  process.exit(1); 
}

const db = admin.firestore();

const agendamentoSchema = z.object({
  nomeCompleto: z.string().min(3, { message: "O nome deve ter pelo menos 3 caracteres." }),
  telefone: z.string().min(10, { message: "O telefone deve ter pelo menos 10 dígitos." }),
  dataNascimento: z.string().date({ message: "Por favor, insira uma data de nascimento válida." }),
  horario: z.string({ required_error: "A seleção de um horário é obrigatória." }),
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

    console.log("Agendamento salvo com sucesso no Firestore. ID:", docRef.id);
    return res.status(201).json({
      message: "Agendamento solicitado com sucesso!",
      agendamentoId: docRef.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.warn("Falha na validação dos dados:", error.flatten().fieldErrors);
      return res.status(400).json({
        error: "Dados inválidos.",
        details: error.flatten().fieldErrors,
      });
    }

    console.error("Erro interno do servidor ao criar agendamento:", error);
    return res.status(500).json({ error: "Ocorreu um erro interno. Tente novamente." });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor backend rodando na porta ${PORT}`);
  if (process.env.FRONTEND_URL) {
    console.log(`Permitindo requisições de: ${process.env.FRONTEND_URL}`);
  } else {
    console.warn("A variável de ambiente FRONTEND_URL não está definida. O CORS pode bloquear requisições.");
  }
});