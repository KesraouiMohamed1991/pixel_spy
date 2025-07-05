const express = require("express");
const sharp = require("sharp");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
app.use(cors());
const morgan = require("morgan");
app.use(morgan("combined"));

app.use(express.static(path.join(__dirname, "public")));
app.set("trust proxy", true);

// Connexion à MongoDB
const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log("✅ MongoDB connecté"))
    .catch((err) => console.error("❌ Erreur connexion MongoDB:", err));

// Schéma et modèle pour stocker les logs
const pixelLogSchema = new mongoose.Schema({
    ip: String,
    email: String,
    path: String,
    query: Object,
    userAgent: String,
    createdAt: { type: Date, default: Date.now },
});

const PixelLog = mongoose.model("PixelLog", pixelLogSchema);

// Middleware pour logger les requêtes /pixel dans MongoDB
app.use("/pixel", async (req, res, next) => {
    try {
        await PixelLog.create({
            ip: req.ip,
            email: req.query.email || null,
            path: req.path,
            query: req.query,
            userAgent: req.get("User-Agent") || null,
        });
    } catch (err) {
        console.error("Erreur lors de la sauvegarde du log MongoDB :", err);
    }
    next();
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get("/pixel", async (req, res) => {
    try {
        const imgBuffer = await sharp({
            create: {
                width: 1,
                height: 1,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            },
        })
            .png()
            .toBuffer();

        res.set({
            "Content-Type": "image/png",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
        });
        res.send(imgBuffer);
    } catch (err) {
        console.error("Erreur lors de la génération de l’image pixel :", err);
        res.status(500).send("Erreur serveur");
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

