import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { ingestDocument } from '../brain/ingest';
import { VectorStore } from '../brain/vectorStore';
import { CONFIG } from '../config';
import { describeImageWithLLM } from '../models/llmRouter';
import { setActiveProvider, getActiveProvider } from '../runtimeConfig';

/**
 * Auto-selects the best available LLM for a media type and switches the
 * runtime provider. Returns { switched, previousProvider, provider }.
 * Vision tasks: Claude → OpenAI (both support multimodal)
 * Audio/video transcription: requires OpenAI (Whisper)
 */
function autoSelectProviderForMedia(mediaType: 'image' | 'audio' | 'video'): { switched: boolean; previousProvider: string; provider: string } {
  const prev = getActiveProvider();
  if (mediaType === 'image') {
    if (CONFIG.claudeApiKey) {
      setActiveProvider('claude');
      return { switched: prev !== 'claude', previousProvider: prev, provider: 'claude' };
    }
    if (CONFIG.openaiApiKey) {
      setActiveProvider('openai');
      return { switched: prev !== 'openai', previousProvider: prev, provider: 'openai' };
    }
    throw new Error('Image analysis requires a Claude or OpenAI API key. Please set CLAUDE_API_KEY or OPENAI_API_KEY.');
  }
  // audio / video — Whisper only
  if (!CONFIG.openaiApiKey) {
    throw new Error('Audio/video transcription requires an OpenAI API key. Please set OPENAI_API_KEY in backend/.env.');
  }
  // Don't switch the chat provider just because we're transcribing — Whisper is a separate endpoint
  return { switched: false, previousProvider: prev, provider: prev };
}

const TEXT_EXTENSIONS  = new Set(['.pdf', '.md', '.markdown', '.txt', '.docx']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.flac']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm']);

const ALL_EXTENSIONS = new Set([
  ...TEXT_EXTENSIONS, ...IMAGE_EXTENSIONS, ...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS,
]);

function getOpenAI() {
  if (!CONFIG.openaiApiKey) throw new Error('OPENAI_API_KEY not set — required for audio/video transcription.');
  return new OpenAI({ apiKey: CONFIG.openaiApiKey });
}

export function createUploadRouter(store: VectorStore): Router {
  const router = Router();

  const upload = multer({
    storage: multer.memoryStorage(),
    limits:  { fileSize: (CONFIG.maxFileSizeMb || 50) * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ext = '.' + (file.originalname.split('.').pop()?.toLowerCase() ?? '');
      if (ALL_EXTENSIONS.has(ext)) return cb(null, true);
      cb(new Error(`Unsupported file type: ${file.originalname}. Supported: PDF, DOCX, MD, TXT, images (JPG/PNG/GIF/WEBP), audio (MP3/WAV/M4A/OGG), video (MP4/MOV/AVI/MKV).`));
    },
  });

  // POST /api/upload — ingest a document or media file
  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) { res.status(400).json({ error: err.message }); return; }
      if (err instanceof Error)              { res.status(400).json({ error: err.message }); return; }
      next();
    });
  }, async (req: Request, res: Response): Promise<void> => {
    if (!req.file) { res.status(400).json({ error: 'No file provided.' }); return; }

    const file     = req.file;
    const filename = file.originalname;
    const ext      = '.' + (filename.split('.').pop()?.toLowerCase() ?? '');
    const id       = uuidv4();
    let   content  = '';
    let   type     = '';

    try {
      // ── Text documents ──────────────────────────────────────────────────────
      if (ext === '.pdf') {
        const data = await pdfParse(file.buffer);
        content    = data.text;
        type       = 'pdf';
      } else if (ext === '.md' || ext === '.markdown') {
        content = file.buffer.toString('utf-8');
        type    = 'markdown';
      } else if (ext === '.txt') {
        content = file.buffer.toString('utf-8');
        type    = 'text';
      } else if (ext === '.docx') {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        content = result.value;
        type    = 'docx';

      // ── Images — auto-select vision LLM, describe with it ──────────────────
      } else if (IMAGE_EXTENSIONS.has(ext)) {
        const autoSwitch = autoSelectProviderForMedia('image');
        const mimeMap: Record<string, string> = {
          '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
          '.gif': 'image/gif',  '.webp': 'image/webp',
        };
        const mimeType = mimeMap[ext] ?? 'image/jpeg';
        const base64   = file.buffer.toString('base64');
        const description = await describeImageWithLLM(
          { base64, mimeType },
          'Describe this image in exhaustive detail. Include all visible text, objects, people, colours, layout, data, charts, diagrams, and any other relevant information. Be thorough — this description will be used as the knowledge-base entry.',
        );
        content = `[IMAGE: ${filename}]\n\n${description}`;
        type    = 'image';
        console.log(`[upload] Image analysis via ${autoSwitch.provider}${autoSwitch.switched ? ` (auto-switched from ${autoSwitch.previousProvider})` : ''}`);

      // ── Audio — auto-select OpenAI Whisper for transcription ───────────────
      } else if (AUDIO_EXTENSIONS.has(ext)) {
        autoSelectProviderForMedia('audio');
        const oai = getOpenAI();
        const blob = new Blob([file.buffer], { type: file.mimetype || 'audio/mpeg' });
        const transcription = await oai.audio.transcriptions.create({
          file: new File([blob], filename, { type: file.mimetype || 'audio/mpeg' }),
          model: 'whisper-1',
          language: 'en',
        });
        content = `[AUDIO TRANSCRIPT: ${filename}]\n\n${transcription.text}`;
        type    = 'audio';

      // ── Video — Whisper extracts and transcribes audio track ───────────────
      } else if (VIDEO_EXTENSIONS.has(ext)) {
        autoSelectProviderForMedia('video');
        try {
          const oai = getOpenAI();
          const blob = new Blob([file.buffer], { type: 'video/mp4' });
          const transcription = await oai.audio.transcriptions.create({
            file: new File([blob], filename.replace(/\.[^.]+$/, '.mp4'), { type: 'video/mp4' }),
            model: 'whisper-1',
            language: 'en',
          });
          content = `[VIDEO TRANSCRIPT: ${filename}]\n\n${transcription.text}`;
          type    = 'video';
        } catch {
          content = `[VIDEO FILE: ${filename}]\n\nThis video file has been added to the knowledge base. Audio transcription was unavailable. The file can be referenced by name in questions.`;
          type    = 'video';
        }
      } else {
        res.status(400).json({ error: `Unsupported extension "${ext}".` });
        return;
      }

      if (!content?.trim()) {
        res.status(422).json({ error: `"${filename}" appears to be empty or unreadable.` });
        return;
      }

      const { chunksAdded } = await ingestDocument({ id, filename, content, type, store });

      // If image was auto-processed, tell the client which LLM was used
      const activeNow = getActiveProvider();
      res.status(200).json({
        success: true,
        message: `Ingested "${filename}" (${chunksAdded} chunks added).`,
        sourceId: id,
        chunksAdded,
        filename,
        type,
        provider: activeNow,
      });
    } catch (err) {
      console.error(`[upload] Error processing "${filename}":`, err);
      // Return generic message — internal detail (incl. API key fragments) stays server-side
      res.status(500).json({ error: 'Failed to process the uploaded file. Please try again.' });
    }
  });

  // DELETE /api/upload/:sourceId
  router.delete('/:sourceId', (req: Request, res: Response): void => {
    const { sourceId } = req.params;
    if (!sourceId) { res.status(400).json({ error: 'sourceId is required.' }); return; }
    const removed = store.removeBySource(sourceId);
    if (removed === 0) { res.status(404).json({ error: 'Document not found in knowledge base.' }); return; }
    res.status(200).json({ success: true, message: `Removed ${removed} chunks for source ${sourceId}.`, chunksRemoved: removed });
  });

  return router;
}
