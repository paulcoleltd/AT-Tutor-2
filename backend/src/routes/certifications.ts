import { Router } from 'express';
import { CERTIFICATIONS } from '../data/certifications';

export function createCertificationsRouter(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const list = CERTIFICATIONS.map(c => ({
      code:          c.code,
      name:          c.name,
      vendor:        c.vendor,
      category:      c.category,
      level:         c.level,
      questionCount: c.questionCount,
      timeMinutes:   c.timeMinutes,
      passingScore:  c.passingScore,
      domains:       c.domains,
      studyTips:     c.studyTips,
    }));
    res.json({ certifications: list });
  });

  router.get('/:code', (req, res) => {
    // CWE-20: Reject absurdly long cert codes to prevent CPU DoS from toLowerCase+find
    if (req.params.code.length > 20) {
      res.status(400).json({ error: 'Invalid certification code.' });
      return;
    }
    const cert = CERTIFICATIONS.find(
      c => c.code.toLowerCase() === req.params.code.toLowerCase(),
    );
    if (!cert) { res.status(404).json({ error: 'Certification not found.' }); return; }
    res.json(cert);
  });

  return router;
}
