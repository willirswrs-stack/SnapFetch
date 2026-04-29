# SnapFetch - Informações do Projeto

Este é um aplicativo full-stack moderno para download de vídeos e áudios de diversas plataformas sociais, construído com foco em velocidade, usabilidade e uma experiência de usuário premium.

## 🚀 Funcionalidades

- **Suporte Multi-plataforma:** Download de vídeos do YouTube, Facebook (incluindo Anúncios e Reels), Instagram (Reels e Posts) e TikTok.
- **Gerenciador de Downloads Avançado:**
  - Suporte a **Pausar e Retomar** downloads.
  - Barra de progresso em tempo real com cálculo de tamanho e porcentagem.
  - Proxy inteligente para contornar restrições de CORS e forçar download com nomes de arquivos corretos.
- **Interface Premium:**
  - Design Dark Mode moderno com efeitos de vidro (Glassmorphism).
  - Seleção de formato via Radio Buttons customizados e animados.
  - Transições suaves e feedback visual via `motion` (Framer Motion).
- **Histórico Local:** Salva automaticamente o histórico de downloads no navegador.
- **Compartilhamento:** Integração com a API de compartilhamento nativa do sistema.

## 🛠️ Tecnologias Utilizadas

### Frontend (React + Vite)
- **Framework:** React 18 com TypeScript.
- **Estilização:** Tailwind CSS (configuração v4).
- **Ícones:** Lucide React.
- **Animações:** Framer Motion (motion/react).
- **Lógica de Download:** Fetch API com suporte a `ReadableStream` e `Range headers` para possibilitar a pausa/retomada.

### Backend (Node.js + Express)
- **Servidor:** Express.js operando como middleware no Vite.
- **Scraping/Extração:** 
  - `ytdl-core` para YouTube.
  - `axios` e `cheerio` para extração via Regex e DOM Parsing (Facebook/Instagram).
- **Proxy:** Rota `/api/proxy-download` que gerencia o fluxo de dados entre os servidores das redes sociais e o cliente, suportando requisições parciais (Bytes Range).

## 📂 Estrutura de Arquivos Principal

- `/src/App.tsx`: Componente principal contendo toda a interface e lógica de estado do cliente.
- `/server.ts`: Servidor Express com a lógica de extração de links e proxy de download.
- `/src/index.css`: Estilos globais e variáveis de tema do Tailwind.
- `PROJECT_INFO.md`: Este documento de referência.

## 📝 Como Rodar Localmente

1. Extraia o arquivo ZIP do projeto.
2. Certifique-se de ter o Node.js instalado.
3. Instale as dependências: `npm install`
4. Inicie o servidor de desenvolvimento: `npm run dev`
5. O app estará disponível em `http://localhost:3000`.

---
*Projeto gerado e mantido via Google AI Studio Build.*
