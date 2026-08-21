# ==========================================
# Stage 1: Build Vite App
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json .npmrc* ./
# Clean install for deterministic dependency resolution
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

COPY . .

# Pass the backend URL to the Vite build process
ARG VITE_API_URL=http://localhost:8000/api/v1
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ==========================================
# Stage 2: Serve with Nginx
# ==========================================
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the custom Nginx routing configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the compiled Vite output (from 'dist' folder)
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
