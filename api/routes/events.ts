import { Router } from 'express';
import { notifyService } from '../services/NotifyService.js';
import crypto from 'crypto';
import type { SSESubscriptionRule } from '../../shared/types.js';

const router = Router();

router.get('/', (req, res) => {
  const clientId = crypto.randomUUID();

  let rules: SSESubscriptionRule[] = [];
  try {
    const rulesHeader = req.headers['x-sse-rules'];
    if (rulesHeader) {
      const rulesStr = Array.isArray(rulesHeader) ? rulesHeader[0] : rulesHeader;
      rules = JSON.parse(decodeURIComponent(rulesStr));
    }
  } catch {
    rules = [];
  }

  notifyService.addClient(clientId, res, rules);

  res.on('close', () => {
    notifyService.notifyClientOffline(clientId, 'client');
  });
});

router.post('/:clientId/rules', (req, res) => {
  const { clientId } = req.params;
  const { rules } = req.body as { rules?: SSESubscriptionRule[] };

  if (!rules) {
    res.status(400).json({ success: false, error: 'Rules are required' });
    return;
  }

  const updated = notifyService.setSubscriptionRules(clientId, rules);
  if (!updated) {
    res.status(404).json({ success: false, error: 'Client not found' });
    return;
  }

  res.json({ success: true, data: { clientId, ruleCount: rules.length } });
});

router.get('/:clientId/rules', (req, res) => {
  const { clientId } = req.params;
  const rules = notifyService.getSubscriptionRules(clientId);

  if (!rules) {
    res.status(404).json({ success: false, error: 'Client not found' });
    return;
  }

  res.json({ success: true, data: { clientId, rules } });
});

router.get('/stats', (_req, res) => {
  const stats = notifyService.getFilterStats();
  const clients = notifyService.getConnectedClients();

  res.json({
    success: true,
    data: {
      ...stats,
      clients,
    },
  });
});

export default router;
