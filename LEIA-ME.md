# 🚀 SnapFetch - Guia de Instalação e Execução

## O que é este projeto?
**SnapFetch** é um aplicativo full-stack para download de vídeos de redes sociais (YouTube, TikTok, Instagram, Facebook) com suporte a remoção de marca d'água. Funciona no navegador do PC e do celular.

---

## ⚠️ Pré-requisitos Obrigatórios

Antes de rodar, instale as ferramentas abaixo. Você pode usar o **script automático** na seção seguinte.

| Ferramenta | Para que serve | Link |
|---|---|---|
| **Node.js 20+ LTS** | Rodar o servidor | https://nodejs.org |
| **FFmpeg (Portátil)** | Já incluso no projeto | Automático via npm |

---

## ⚡ Instalação Automática (Recomendado)

### Windows
Abra o **PowerShell** como Administrador e execute:
```powershell
winget install --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
winget install --id Gyan.FFmpeg --accept-source-agreements --accept-package-agreements
```
Depois de instalar, **feche e abra o PowerShell novamente** para atualizar o PATH.

### Mac/Linux
```bash
# Mac (com Homebrew)
brew install node ffmpeg

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs ffmpeg
```

---

## 🚀 Modo de Produção (Deixar Rodando)

Para rodar o aplicativo de forma profissional e estável:

### 1. Construir e Iniciar
```bash
npm install
npm run build
npm start
```

### 2. Usando Docker (Recomendado para Produção)
Se você tem o Docker instalado:
```bash
docker build -t snapfetch .
docker run -d -p 3000:3000 --name snapfetch snapfetch
```

### 3. Configurações (.env)
Você pode alterar a porta e o ambiente no arquivo `.env`:
- `PORT=3000`
- `NODE_ENV=production`

---

## 📱 Instalar no Celular como App (PWA)

1. No celular, abra o navegador (Chrome recomendado) e acesse o endereço IP acima
2. **Android:** Toque nos 3 pontinhos do Chrome → "Adicionar à tela inicial"
3. **iPhone (Safari):** Toque no ícone de compartilhar → "Adicionar à tela de início"

---

## 🛠️ Funcionalidades

| Funcionalidade | Status |
|---|---|
| Download do YouTube (até 4K) | ✅ |
| Download do TikTok (sem marca d'água) | ✅ |
| Download do Instagram (Reels/Posts) | ✅ |
| Download do Facebook (Vídeos/Reels/Ads) | ✅ |
| Download de Áudio (MP3) | ✅ |
| Pausar e Retomar downloads | ✅ |
| Histórico de downloads | ✅ |
| Remover marca d'água (vídeos locais) | ✅ (requer FFmpeg) |
| Upload de vídeo do dispositivo | ✅ |
| Instalar como app no celular (PWA) | ✅ |

---

## 📂 Estrutura de Arquivos

```
snapfetch/
├── src/
│   ├── App.tsx         # Interface principal (React + TypeScript)
│   ├── index.css       # Estilos globais (Tailwind v4)
│   └── main.tsx        # Ponto de entrada React
├── public/
│   ├── manifest.json   # Configuração PWA
│   └── sw.js           # Service Worker (cache offline)
├── server.ts           # Servidor Express + API de download
├── vite.config.ts      # Configuração do Vite
├── package.json        # Dependências do projeto
└── index.html          # HTML principal
```

---

## 🔧 Solução de Problemas

### "npm não reconhecido"
→ O Node.js não foi instalado ou o terminal precisa ser reiniciado após a instalação.

### "FFmpeg não encontrado" (ao remover marca d'água)
→ Instale o FFmpeg e reinicie o terminal.

### Celular não consegue acessar
→ Verifique se o celular e o computador estão na mesma rede Wi-Fi.
→ Desative temporariamente o firewall do Windows para testar.

### Porta 3000 já está em uso
→ Mude a porta em `server.ts` na linha `const PORT = 3000;` para `3001` e acesse `localhost:3001`.

---

## 📝 Notas Técnicas

- **Frontend:** React 19 + TypeScript + Tailwind CSS v4 + Framer Motion
- **Backend:** Node.js + Express + Vite (middleware mode)
- **YouTube:** Usa `@distube/ytdl-core`
- **TikTok:** Usa a API pública do TikWM
- **Instagram/Facebook:** Scraping via Cheerio + Regex
- **Marca d'água:** FFmpeg com filtro `delogo`
