FROM node:20-slim

WORKDIR /app

# Install backend dependencies first (cached layer — only reinstalls when package files change)
COPY 03_backend/package*.json ./03_backend/
RUN cd 03_backend && npm install --omit=dev

# Copy the rest of the repo — backend code plus the sibling frontend folder
# server.js serves 04_frontend/ via path.join(__dirname, '..', '04_frontend'),
# so both must exist at these exact relative paths inside the image.
COPY 03_backend ./03_backend
COPY 04_frontend ./04_frontend

WORKDIR /app/03_backend

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
