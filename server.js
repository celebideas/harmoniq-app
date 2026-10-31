// server.ts
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var port = Number(process.env.PORT) || 3e3;
app.use(express.json());
app.get("/api/youtube-search", async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) {
      res.status(400).json({ error: "Missing query" });
      return;
    }
    const ytRes = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`);
    const text = await ytRes.text();
    const matches = text.match(/"videoId":"([a-zA-Z0-9_-]{11})"/g);
    const videoId = matches && matches[0] ? matches[0].replace(/"videoId":"|"/g, "") : null;
    res.json({ videoId });
  } catch (err) {
    res.json({ videoId: null });
  }
});
app.use(express.static(path.join(__dirname, "dist")));
app.get("*", (_req, res) => {
  const indexPath = path.join(__dirname, "dist", "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send('<!doctype html><html lang="tr"><head><title>Harmoniq</title></head><body>Harmoniq y\xFCkleniyor...</body></html>');
    }
  });
});
if (process.env.NODE_ENV !== "test") {
  app.listen(port, "0.0.0.0", () => {
    console.log(`Harmoniq production server listening on port ${port}`);
  });
}
var server_default = app;
export {
  server_default as default
};
