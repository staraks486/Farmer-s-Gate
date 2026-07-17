# 🌾 Farmer's Gate Online - Deployment Guide

This guide explains how to successfully run and deploy the **Farmer's Gate Online** web application on Netlify or any other static hosting provider.

---

## 🛑 Why am I seeing the "Failed to load module script" error on Netlify?

If you see an error like:
> `Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of "application/octet-stream"...`

This happens because **Netlify is serving your raw source code (the root folder) instead of the compiled production-ready folder (`dist`)**. 

Web browsers cannot read `.tsx` or TypeScript files directly. The application must be built (compiled into standard JavaScript) using Vite, and **only the contents of the `dist` folder should be served**.

---

## 🚀 How to Fix and Deploy Successfully

You can deploy this application to Netlify using **one of the two options below**:

### 📦 Option A: Deployment via GitHub (Recommended)
This is the best way because Netlify will automatically rebuild your site every time you push changes to GitHub.

1. **Push your code to GitHub**:
   Ensure all files (including `netlify.toml` and `package.json`) are committed and pushed to your GitHub repository.
2. **Connect to Netlify**:
   - Go to your [Netlify Dashboard](https://app.netlify.com/).
   - Click **Add new site** -> **Import an existing project**.
   - Select **GitHub** and choose your repository.
3. **Configure Build Settings**:
   Netlify should automatically detect the `netlify.toml` file. If it doesn't, fill in these exact settings:
   - **Build command**: `npm run build:client`
   - **Publish directory**: `dist`
4. **Deploy**:
   Click **Deploy site**. Netlify will build the app and serve it from the `dist` folder.

---

### 📂 Option B: Manual Drag-and-Drop Deployment
If you are uploading files manually to Netlify without linking a GitHub repository:

1. **Build the project locally**:
   In your project terminal, run:
   ```bash
   npm run build:client
   ```
   This will generate a new folder called **`dist`** in your project root.
2. **Upload only the `dist` folder**:
   - Go to [Netlify Drop](https://app.netlify.com/drop).
   - Drag and drop **ONLY the `dist` folder** into the upload area.
   - ⚠️ **Do NOT upload the entire project folder** (do not include `src`, `package.json`, `index.html` from the root, etc.). Only drag the compiled `dist` folder.

---

## 🛠️ Project Scripts Reference

- `npm run dev`: Starts the local development server (Express server for local testing).
- `npm run build:client`: Compiles the React/Vite front-end into standard HTML/JS/CSS inside the `/dist` directory (this is what static hosts like Netlify serve).
- `npm run build`: Bundles both the client and server for full-stack deployment.
