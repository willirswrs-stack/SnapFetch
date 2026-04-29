import express from "express";
import dotenv from "dotenv";
dotenv.config();
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import ytdl from "@distube/ytdl-core";
import axios from "axios";
import contentDisposition from "content-disposition";
import * as cheerio from "cheerio";
import archiver from "archiver";
import fs from "fs";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { exec, execSync } from "child_process";

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';

// Helper for yt-dlp
async function getYtDlpInfo(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // Increase maxBuffer to 10MB to handle large JSON outputs
    exec(`yt-dlp -j --no-warnings --user-agent "${USER_AGENT}" "${url}"`, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[yt-dlp Error]: ${error.message}`);
        if (stderr) console.error(`[yt-dlp Stderr]: ${stderr}`);
        return reject(error);
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        console.error(`[yt-dlp Parse Error]: Failed to parse JSON. Stdout snippet: ${stdout.substring(0, 200)}`);
        reject(e);
      }
    });
  });
}

// Set ffmpeg path from installer
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
console.log(`🎥 FFmpeg Path: ${ffmpegInstaller.path}`);

// Check if FFmpeg is installed/working
let isFfmpegAvailable = false;
exec(`"${ffmpegInstaller.path}" -version`, (error) => {
  if (error) {
    console.warn("⚠️ AVISO: FFmpeg portátil não detectado ou com erro. O recurso de remover marca d'água pode não funcionar.");
  } else {
    isFfmpegAvailable = true;
    console.log("✅ FFmpeg portátil detectado e pronto para uso.");
  }
});

// Helper to cleanup uploads directory
const cleanupUploads = () => {
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) return;

  const files = fs.readdirSync(uploadDir);
  const now = Date.now();
  const maxAge = 2 * 60 * 60 * 1000; // 2 hours

  files.forEach(file => {
    const filePath = path.join(uploadDir, file);
    const stats = fs.statSync(filePath);
    if (now - stats.mtimeMs > maxAge) {
      try {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Arquivo temporário removido: ${file}`);
      } catch (err) {
        console.error(`Erro ao remover arquivo ${file}:`, err);
      }
    }
  });
};

// Run cleanup every hour
setInterval(cleanupUploads, 60 * 60 * 1000);

// Setup storage for uploaded videos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `upload_${Date.now()}_${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get("/api/info", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      // YouTube & Shorts
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        try {
          const isShorts = url.includes("/shorts/");
          const info: any = await getYtDlpInfo(url);
          
          const formats = info.formats
            .filter((f: any) => f.vcodec !== 'none' || f.acodec !== 'none')
            .map((f: any) => ({
              qualityLabel: f.format_note || f.resolution || `${f.height}p`,
              url: f.url,
              container: f.ext || 'mp4',
              type: (f.vcodec !== 'none' ? 'video' : 'audio') as 'video' | 'audio',
              hasAudio: f.acodec !== 'none'
            }))
            .filter((v: any, i: number, a: any[]) => a.findIndex(t => t.qualityLabel === v.qualityLabel && t.type === v.type) === i)
            .sort((a: any, b: any) => (parseInt(b.qualityLabel) || 0) - (parseInt(a.qualityLabel) || 0));

          return res.json({
            platform: isShorts ? "YouTube Shorts" : "YouTube",
            title: info.title,
            thumbnail: info.thumbnail,
            downloadUrl: info.url || formats[0]?.url,
            formats: formats,
            filename: `${info.title.replace(/[^\w\s-]/g, '')}`
          });
        } catch (ytError) {
          console.warn("yt-dlp failed, falling back to ytdl-core", ytError);
          // Fallback to original ytdl-core logic
          const isShorts = url.includes("/shorts/");
          const info = await ytdl.getInfo(url, {
            requestOptions: {
              headers: {
                'User-Agent': USER_AGENT,
              }
            }
          });
          
          const videoFormats = info.formats
            .filter(f => f.hasVideo)
            .map(f => ({
              qualityLabel: f.qualityLabel || `${f.height}p`,
              url: f.url,
              container: f.container || "mp4",
              type: "video" as const,
              hasAudio: f.hasAudio
            }))
            .filter((v, i, a) => a.findIndex(t => t.qualityLabel === v.qualityLabel) === i)
            .sort((a, b) => (parseInt(b.qualityLabel) || 0) - (parseInt(a.qualityLabel) || 0));

          const audioFormats = info.formats
            .filter(f => !f.hasVideo && f.hasAudio)
            .map(f => ({
              qualityLabel: `${f.audioBitrate}kbps`,
              url: f.url,
              container: (f.container as string) === 'm4a' ? 'm4a' : 'mp3',
              type: "audio" as const
            }))
            .filter((v, i, a) => a.findIndex(t => t.qualityLabel === v.qualityLabel) === i)
            .sort((a, b) => (parseInt(b.qualityLabel) || 0) - (parseInt(a.qualityLabel) || 0));

          return res.json({
            platform: isShorts ? "YouTube Shorts" : "YouTube",
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            downloadUrl: videoFormats[0]?.url || audioFormats[0]?.url || "",
            formats: [...videoFormats, ...audioFormats],
            filename: `${info.videoDetails.title.replace(/[^\w\s-]/g, '')}`
          });
        }
      }

      // TikTok
      if (url.includes("tiktok.com")) {
        // Use TikWM API
        const response = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
        const data = response.data;
        
        if (data.code === 0 && data.data) {
          const videoFormats = [{
            qualityLabel: 'Sem Marca d\'água',
            url: data.data.play,
            container: 'mp4',
            type: 'video' as const
          }, {
            qualityLabel: 'Com Marca d\'água',
            url: data.data.wmplay,
            container: 'mp4',
            type: 'video' as const
          }];

          const audioFormats = [{
            qualityLabel: 'Áudio Original',
            url: data.data.music,
            container: 'mp3',
            type: 'audio' as const
          }];

          return res.json({
            platform: "TikTok",
            title: data.data.title || `Vídeo de ${data.data.author.unique_id}`,
            thumbnail: data.data.cover,
            downloadUrl: data.data.play,
            formats: [...videoFormats, ...audioFormats],
            filename: `tiktok_${data.data.id}`
          });
        }
        throw new Error("Não foi possível obter dados do TikTok. Verifique se o vídeo é público.");
      }

      // Facebook (Videos, Reels, Ads)
      if (url.includes("facebook.com") || url.includes("fb.watch") || url.includes("fb.com") || url.includes("facebook.com/ads/library")) {
        // Normalize mobile and ads links
        let targetUrl = url.replace("m.facebook.com", "www.facebook.com");
        if (targetUrl.includes("facebook.com/ads/library")) {
          // Ads library often needs standard www prefix
          targetUrl = targetUrl.replace("facebook.com/ads/library", "www.facebook.com/ads/library");
        }
        
        const response = await axios.get(targetUrl, {
          headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Cookie': 'noscript=1'
          },
          timeout: 10000 // 10s timeout
        });

        const html = response.data;
        const $ = cheerio.load(html);
        
        // Try multiple meta tags first
        const ogVideo = $('meta[property="og:video"]').attr('content') || 
                        $('meta[property="og:video:secure_url"]').attr('content') ||
                        $('meta[name="twitter:player:stream"]').attr('content');
        
        // Comprehensive regex for Facebook video formats (SD/HD/Ads)
        const sdMatch = html.match(/"browser_native_sd_url":"([^"]+)"/) || 
                        html.match(/"playable_url":"([^"]+)"/) ||
                        html.match(/"sd_src":"([^"]+)"/);
                        
        const hdMatch = html.match(/"browser_native_hd_url":"([^"]+)"/) || 
                        html.match(/"playable_url_quality_hd":"([^"]+)"/) ||
                        html.match(/"hd_src":"([^"]+)"/);

        const sdUrl = (sdMatch?.[1] || ogVideo || "").replace(/\\/g, '');
        const hdUrl = (hdMatch?.[1] || "").replace(/\\/g, '');

        const formats = [];
        if (hdUrl && hdUrl.startsWith('http')) {
          formats.push({
            qualityLabel: 'Alta Qualidade (HD)',
            url: hdUrl,
            container: 'mp4',
            type: 'video' as const
          });
        }
        
        if (sdUrl && sdUrl.startsWith('http')) {
          const isDup = formats.some(f => f.url === sdUrl);
          if (!isDup) {
            formats.push({
              qualityLabel: 'Qualidade Padrão (SD)',
              url: sdUrl,
              container: 'mp4',
              type: 'video' as const
            });
          }
        }

        const title = $('meta[property="og:title"]').attr('content') || 
                      $('title').text() || 
                      (url.includes("ads/library") ? "Anúncio do Facebook" : "Vídeo do Facebook");
        
        const thumbnail = $('meta[property="og:image"]').attr('content') || 
                          $('meta[name="twitter:image"]').attr('content') || 
                          "";

        if (formats.length > 0) {
          return res.json({
            platform: url.includes("ads/library") ? "Facebook Ads" : "Facebook",
            title: title.split('|')[0].trim(),
            thumbnail: thumbnail,
            downloadUrl: formats[0].url,
            formats: formats,
            filename: `facebook_${Date.now()}`
          });
        }
        throw new Error("Não foi possível encontrar um vídeo público neste link do Facebook. Verifique se o conteúdo é público ou se o anúncio ainda está ativo.");
      }

      // Instagram (Reels, Posts)
      if (url.includes("instagram.com")) {
        try {
          const info: any = await getYtDlpInfo(url);
          return res.json({
            platform: "Instagram",
            title: info.title || "Post do Instagram",
            thumbnail: info.thumbnail,
            downloadUrl: info.url,
            formats: [{
              qualityLabel: 'Qualidade Original',
              url: info.url,
              container: 'mp4',
              type: 'video'
            }],
            filename: `instagram_${Date.now()}`
          });
        } catch (igError) {
          console.warn("yt-dlp failed for Instagram, falling back to scraping", igError);
          // Fallback to original scraping logic
          const response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              'Sec-Fetch-Dest': 'document',
              'Sec-Fetch-Mode': 'navigate',
              'Sec-Fetch-Site': 'none',
            },
            timeout: 10000
          });

          const html = response.data;
          const $ = cheerio.load(html);
          
          let videoUrl = $('meta[property="og:video"]').attr('content') || 
                        $('meta[property="og:video:secure_url"]').attr('content');
          
          // ... (keep the rest of the logic or simplify)
          if (videoUrl) {
            return res.json({
              platform: "Instagram",
              title: "Post do Instagram",
              thumbnail: $('meta[property="og:image"]').attr('content') || "",
              downloadUrl: videoUrl,
              formats: [{ qualityLabel: 'Original', url: videoUrl, container: 'mp4', type: 'video' }],
              filename: `instagram_${Date.now()}`
            });
          }
          throw new Error("Não foi possível encontrar o vídeo no Instagram.");
        }
      }
      
      // Fallback extraction logic using a generic approach if everything else fails
      if (url.includes("threads.net")) {
         // Threads support could be added here
      }

      return res.status(400).json({ error: "Plataforma não suportada no momento ou URL inválida. Suportamos YouTube, TikTok, Facebook e Instagram." });
    } catch (error: any) {
      console.error(error);
      const message = error.response?.status === 404 ? "Vídeo não encontrado." : error.message;
      return res.status(500).json({ error: "Erro: " + message });
    }
  });

  // Proxy route to bypass CORS and force download with Range support for Resume
  app.get("/api/proxy-download", async (req, res) => {
    const { url, filename } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).send("URL é obrigatória");
    }

    // Security: Validate URL domain to prevent SSRF
    try {
      const parsedUrl = new URL(url);
      const allowedDomains = [
        'googlevideo.com', // YouTube
        'tiktok.com', 
        'tiktokv.com', 
        'tiktokcdn.com',
        'tiktokcdn-us.com',
        'fbcdn.net', // Facebook/Instagram
        'instagram.com',
        'twimg.com', 
        'tikwm.com',
        'snapchat.com',
        'v.redd.it'
      ];
      
      const isAllowed = allowedDomains.some(domain => parsedUrl.hostname.includes(domain));
      if (!isAllowed) {
        console.warn(`Tentativa de acesso a domínio não autorizado: ${parsedUrl.hostname}`);
        return res.status(403).send("Domínio não autorizado para proxy.");
      }
    } catch (e) {
      return res.status(400).send("URL inválida");
    }

    const range = req.headers.range;

    try {
      const config: any = {
        method: 'get',
        url: url,
        responseType: 'stream',
        headers: {
          'User-Agent': USER_AGENT
        }
      };

      if (range) {
        config.headers.Range = range;
        // Some servers require the range to be exactly what was requested
      }

      const response = await axios({
        ...config,
        timeout: 0, // No timeout for download streams
      });

      const status = response.status;
      res.status(status);

      // Pass through important headers
      if (response.headers['content-range']) res.setHeader('Content-Range', response.headers['content-range'].toString());
      if (response.headers['content-length']) res.setHeader('Content-Length', response.headers['content-length'].toString());
      if (response.headers['accept-ranges']) res.setHeader('Accept-Ranges', response.headers['accept-ranges'].toString());
      
      res.setHeader('Content-Disposition', contentDisposition(filename as string || 'video.mp4'));
      res.setHeader('Content-Type', (response.headers['content-type'] as string) || 'video/mp4');
      
      response.data.pipe(res);
    } catch (error: any) {
      console.error("Proxy error:", error);
      if (error.response) {
        res.status(error.response.status).send(error.response.statusText);
      } else {
        res.status(500).send("Error downloading file");
      }
    }
  });

  // Route to download source code
  app.get("/api/download-source", (req, res) => {
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    res.attachment('snapfetch_source.zip');

    archive.on('error', (err) => {
      res.status(500).send({ error: err.message });
    });

    archive.pipe(res);

    // Add source files
    archive.file('server.ts', { name: 'server.ts' });
    archive.file('package.json', { name: 'package.json' });
    archive.file('index.html', { name: 'index.html' });
    archive.file('PROJECT_INFO.md', { name: 'PROJECT_INFO.md' });
    archive.directory('src/', 'src');
    archive.directory('public/', 'public');

    archive.finalize();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    console.log(`📦 Servindo arquivos estáticos de: ${distPath}`);
    
    if (!fs.existsSync(distPath)) {
      console.error("❌ ERRO: Pasta 'dist' não encontrada! Certifique-se de que 'npm run build' funcionou.");
    }

    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Erro: index.html não encontrado na pasta dist.");
      }
    });
  }

  // New Route: Upload video from device
  app.post("/api/upload", upload.single('video'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }
    res.json({ 
      filename: req.file.filename,
      path: req.file.path,
      originalName: req.file.originalname
    });
  });

  // New Route: Remove Watermark using FFmpeg
  app.post("/api/remove-watermark", async (req, res) => {
    const { filename, area } = req.body; // area: { x, y, width, height }
    if (!filename) return res.status(400).json({ error: "Arquivo no especificado" });

    const inputPath = path.join(process.cwd(), 'uploads', filename);
    const outputPath = path.join(process.cwd(), 'uploads', `clean_${filename}`);

    if (!fs.existsSync(inputPath)) return res.status(404).json({ error: "Arquivo no encontrado" });

    try {
      if (!isFfmpegAvailable) {
        throw new Error("FFmpeg não está instalado no servidor. Não é possível processar o vídeo.");
      }

      // Basic watermark removal using boxblur or delogo
      // Default area if not provided (TikTok/IG usually top-left or bottom-right)
      const x = area?.x || 10;
      const y = area?.y || 10;
      const w = area?.width || 200;
      const h = area?.height || 100;

      ffmpeg(inputPath)
        .videoFilters([
          {
            filter: 'delogo',
            options: { x, y, w, h }
          }
        ])
        .on('end', () => {
          res.json({ 
            success: true, 
            downloadUrl: `/api/download-processed?filename=clean_${filename}`,
            filename: `clean_${filename}`
          });
        })
        .on('error', (err) => {
          console.error("FFmpeg error:", err);
          res.status(500).json({ error: "Erro ao processar vídeo. Verifique se o FFmpeg está instalado." });
        })
        .save(outputPath);

    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/download-processed", (req, res) => {
    const { filename } = req.query;
    if (!filename) return res.status(400).send("Filename required");
    const filePath = path.join(process.cwd(), 'uploads', filename as string);
    if (!fs.existsSync(filePath)) return res.status(404).send("File not found");
    res.download(filePath);
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 SnapFetch Server está ATIVO!`);
    console.log(`🌍 URL Local: http://localhost:${PORT}`);
    console.log(`📁 Diretório Atual: ${process.cwd()}`);
    console.log(`🔧 Ambiente: ${process.env.NODE_ENV}`);
  });
}

startServer();
