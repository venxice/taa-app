// ============================================================
// API Routes - Main Router
// ============================================================
import { Router } from 'express';

import authRoutes from '../features/auth/auth.routes';
import userRoutes from '../features/users/user.routes';
import residentRoutes from '../features/residents/resident.routes';
import announcementRoutes from '../features/announcements/announcement.routes';
import incidentRoutes from '../features/incidents/incident.routes';
import paymentRoutes from '../features/payments/payment.routes';
import officialRoutes from '../features/officials/official.routes';
import dashboardRoutes from '../features/dashboard/dashboard.routes';
import financeRoutes from '../features/finance/finance.routes';

const router = Router();

// Health
router.get('/', (_req, res) => {
  res.json({ success: true, message: 'TAA-App API v1' });
});

// Feature routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/residents', residentRoutes);
router.use('/announcements', announcementRoutes);
router.use('/incidents', incidentRoutes);
router.use('/payments', paymentRoutes);
router.use('/finance', financeRoutes);
router.use('/officials', officialRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
