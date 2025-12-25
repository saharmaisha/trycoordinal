# Worker

The worker processes PDF packages by:
1. Polling for queued jobs from the database
2. Downloading PDFs from Supabase storage
3. Rendering each page to PNG images
4. Uploading PNGs to the `sheet_images` storage bucket
5. Creating sheet records in the database

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

3. Run the worker:
```bash
npm run dev
```

## Dependencies

- `pdfjs-dist`: For parsing and rendering PDF files
- `canvas`: For rendering PDF pages to PNG images
- `@repo/db`: For Supabase client access
- `@repo/shared`: For shared types

## Note

The `canvas` package requires native dependencies. On macOS, you may need:
```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg
```

On Linux (Ubuntu/Debian):
```bash
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

