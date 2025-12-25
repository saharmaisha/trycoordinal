# Plan Delta - Construction Drawing Set Analysis Platform

## V1 Implementation - Step 1 Complete

This is a PDF-first platform for analyzing construction drawing set revisions. The V1 flow supports:
1. Creating Projects
2. Creating Packages (drawing sets)
3. Uploading PDFs
4. Automatic rendering of pages to images with thumbnails
5. Viewing sheet thumbnails in the web UI

## Project Structure

```
ssf/
├── apps/
│   ├── api/          # Express API server
│   ├── web/          # Next.js web application
│   └── worker/       # Background job processor
├── packages/
│   ├── db/           # Supabase client utilities
│   ├── shared/       # Shared types, schemas, constants
│   └── ui/           # Shared UI components
```

## Prerequisites

1. **Node.js** v18+ and npm
2. **Supabase** account with a project set up
3. **Supabase Database** with the following tables created (see schema below)
4. **Supabase Storage** buckets created:
   - `raw_uploads` (private)
   - `sheet_images` (public or private with signed URLs)

## Supabase Setup

### Required Tables

You need to create these tables in your Supabase database:

```sql
-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Packages
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  label TEXT NOT NULL,
  package_date DATE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  discipline TEXT,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  page_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sheets
CREATE TABLE sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  page_index INTEGER NOT NULL,
  image_path TEXT,
  thumb_path TEXT,
  width_px INTEGER,
  height_px INTEGER,
  sheet_number TEXT,
  sheet_title TEXT,
  discipline_guess TEXT,
  meta_confidence FLOAT,
  text_extract_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress FLOAT DEFAULT 0,
  payload JSONB DEFAULT '{}',
  error TEXT,
  logs_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comparisons (not used in Step 1, but schema complete)
CREATE TABLE comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  old_package_id UUID NOT NULL REFERENCES packages(id),
  new_package_id UUID NOT NULL REFERENCES packages(id),
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_packages_project_id ON packages(project_id);
CREATE INDEX idx_documents_package_id ON documents(package_id);
CREATE INDEX idx_sheets_package_id ON sheets(package_id);
CREATE INDEX idx_sheets_document_id ON sheets(document_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_type ON jobs(type);
```

### Storage Buckets

Create these storage buckets in your Supabase dashboard:

1. **raw_uploads** - Private bucket for original PDFs
2. **sheet_images** - Public bucket for rendered images and thumbnails

Set appropriate RLS policies or make sheet_images public for read access.

## Environment Variables

Create `.env.local` files in the following locations:

### `/apps/api/.env.local`

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
PORT=3001
```

### `/apps/worker/.env.local`

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### `/apps/web/.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Important**: Never commit service role keys to git. These are in `.env.local` which is gitignored.

## Installation

From the root of the monorepo:

```bash
npm install
```

This will install dependencies for all workspaces.

## Running Locally

You need to run 3 processes simultaneously. Open 3 terminal windows:

### Terminal 1: API Server

```bash
cd apps/api
npm run dev
```

The API will start on `http://localhost:3001`

### Terminal 2: Worker

```bash
cd apps/worker
npm run dev
```

The worker will start polling for jobs immediately.

### Terminal 3: Web App

```bash
cd apps/web
npm run dev
```

The web app will start on `http://localhost:3000`

## 5-Minute Smoke Test

Follow these steps to verify the complete V1 flow:

### 1. Create a Project (30 seconds)

1. Open `http://localhost:3000` in your browser
2. Click "View Projects"
3. Click "New Project"
4. Enter a project name (e.g., "Test Project")
5. Click "Create Project"

### 2. Create a Package (30 seconds)

1. On the project detail page, click "New Package"
2. Enter a package label (e.g., "Bid Set Rev 1")
3. Optionally set a date
4. Click "Create Package"

### 3. Upload PDFs (1 minute)

1. On the package detail page, use the upload form
2. Select one or more PDF files (construction drawings work best)
3. Click "Upload & Process"
4. You should see:
   - Package status changes to "processing"
   - A job appears showing progress
   - API logs show the upload was successful

### 4. Monitor Processing (2-3 minutes)

Watch the worker terminal for logs. You should see:
- Job picked up
- Document processing starts
- Pages being rendered
- Images uploaded to storage
- Sheets created

The page will auto-refresh every 5 seconds. You'll see:
- Job progress update
- Package status eventually changes to "ready"
- Sheet thumbnails appear in the grid

### 5. Verify Results (30 seconds)

1. Confirm all sheets are visible with thumbnails
2. Check that page numbers are sequential
3. Verify sheet count matches total pages in PDFs
4. Click around to ensure no errors

### Expected Outcomes

✅ **Success indicators:**
- Project and package created successfully
- PDFs uploaded without errors
- Worker picks up the job immediately
- All pages render to PNG images
- Thumbnails generated
- Sheets appear in the web UI
- Package status = "ready"
- Job status = "succeeded"

❌ **Common issues:**
- **Worker not picking up jobs**: Check worker is running and can connect to Supabase
- **Upload fails**: Check API server is running, storage bucket exists
- **Rendering fails**: Check worker logs for PDF parsing errors
- **Images don't appear**: Check storage bucket permissions, public URL generation

## Troubleshooting

### API Server Issues

- Check `.env.local` has correct Supabase credentials
- Verify port 3001 is not in use
- Check API logs for errors

### Worker Issues

- Check worker can connect to Supabase (logs show connection)
- Verify service role key has permissions
- Look for PDF rendering errors in worker logs
- Check storage bucket write permissions

### Web App Issues

- Check `.env.local` has correct public Supabase URL and anon key
- Verify API URL is correct (http://localhost:3001)
- Check browser console for errors
- Verify storage bucket allows public reads (or signed URLs work)

### Database Issues

- Confirm all tables are created with correct schemas
- Check RLS policies don't block service role operations
- Verify foreign key relationships are correct

## What's NOT in Step 1

The following features are planned but NOT implemented in this step:

- ❌ Real user authentication (using placeholder user ID)
- ❌ Sheet metadata extraction (sheet numbers, titles)
- ❌ Sheet pairing between packages
- ❌ Image alignment
- ❌ Change detection
- ❌ RFI packet generation
- ❌ Export functionality
- ❌ Comparisons between packages

These will be implemented in future steps.

## Code Organization

### Shared Package (`packages/shared`)

- **types.ts**: TypeScript interfaces for all domain objects
- **schemas.ts**: Zod schemas for validation
- **constants.ts**: Table names, bucket names, storage path utilities

### API (`apps/api`)

Key endpoints:
- `POST /api/projects` - Create project
- `GET /api/projects` - List projects
- `POST /api/projects/:projectId/packages` - Create package
- `GET /api/projects/:projectId/packages` - List packages
- `POST /api/packages/:packageId/documents/upload` - Upload PDFs
- `GET /api/packages/:packageId/sheets` - List sheets
- `GET /api/packages/:packageId/jobs` - List jobs

### Worker (`apps/worker`)

- Polls for `render_package` jobs
- Downloads PDFs from storage
- Renders each page to PNG using pdfjs-dist
- Generates thumbnails using sharp
- Uploads images to storage
- Creates sheet records
- Updates job progress and status

### Web (`apps/web`)

Key pages:
- `/` - Home page
- `/projects` - Project list
- `/projects/[id]` - Project detail with package list
- `/packages/[id]` - Package detail with upload and sheets

## Architecture Decisions

1. **PDF Rendering**: Using `pdfjs-dist` (Mozilla's PDF.js) because it's pure JavaScript and doesn't require system dependencies like Poppler
2. **Image Processing**: Using `sharp` for thumbnail generation (fast, reliable)
3. **Storage**: Using Supabase Storage buckets with deterministic paths
4. **Job Queue**: Simple polling approach (sufficient for V1; can upgrade to queue service later)
5. **Auth**: Placeholder user ID for now; will integrate Supabase Auth in future step

## Next Steps (Future V1 Phases)

1. Implement sheet metadata extraction (OCR/text parsing)
2. Add comparison creation between two packages
3. Implement sheet pairing algorithm
4. Add image alignment
5. Implement change detection
6. Build review UI for change items
7. Add RFI packet export

## Support

For issues or questions during development, check:
1. Worker logs for processing errors
2. API server logs for request errors
3. Browser console for client errors
4. Supabase dashboard for data verification
