import { Router, Request, Response } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { v4 as uuidv4 } from 'uuid';
import { ingestDocument } from '../brain/ingest';
import { VectorStore } from '../brain/vectorStore';
import { CONFIG } from '../config';

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.md', '.markdown', '.txt']);

export function createUploadRouter(store: VectorStore): Router {
  const router = Router();

  const upload = multer({
    storage: multer.memoryStorage(),
    limits:  { fileSize: CONFIG.maxFileSizeMb * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ext = '.' + (file.originalname.split('.').pop()?.toLowerCase() ?? '');
      if (ALLOWED_EXTENSIONS.has(ext)) return cb(null, true);
      cb(new Error(`Unsupported file type: ${file.originalname}. Use .pdf, .md, or .txt.`));
    },
  });

  // POST /api/upload — ingest a document
  router.post('/', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided.' });
      return;
    }

    const file     = req.file;
    const filename = file.originalname;
    const ext      = filename.split('.').pop()?.toLowerCase() ?? '';
    const id       = uuidv4();
    let content    = '';
    let type       = '';

    try {
      if (ext === 'pdf') {
        const data = await pdfParse(file.buffer);
        content    = data.text;
        type       = 'pdf';
      } else if (ext === 'md' || ext === 'markdown') {
        content = file.buffer.toString('utf-8');
        type    = 'markdown';
      } else if (ext === 'txt') {
        content = file.buffer.toString('utf-8');
        type    = 'text';
      } else {
        res.status(400).json({ error: `Unsupported extension ".${ext}".` });
        return;
      }

      if (!content?.trim()) {
        res.status(422).json({ error: `"${filename}" appears to be empty or unreadable.` });
        return;
      }

      const { chunksAdded } = await ingestDocument({ id, filename, content, type, store });

      res.status(200).json({
        success:     true,
        message:     `Ingested "${filename}" (${chunksAdded} chunks added).`,
        sourceId:    id,
        chunksAdded,
        filename,
        type,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error.';
      console.error(`[upload] Error processing "${filename}":`, err);
      res.status(500).json({ error: message });
    }
  });

  // DELETE /api/upload/:sourceId — remove a document from the knowledge base
  router.delete('/:sourceId', (req: Request, res: Response): void => {
    const { sourceId } = req.params;
    if (!sourceId) {
      res.status(400).json({ error: 'sourceId is required.' });
      return;
    }
    const removed = store.removeBySource(sourceId);
    if (removed === 0) {
      res.status(404).json({ error: 'Document not found in knowledge base.' });
      return;
    }
    res.status(200).json({ success: true, message: `Removed ${removed} chunks for source ${sourceId}.`, chunksRemoved: removed });
  });

  return router;
}
