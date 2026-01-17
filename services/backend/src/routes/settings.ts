import express, { Response } from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/v1/settings
 * Get user settings
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    // Use the authenticated user's ID from JWT token
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const result = await pool.query(
      `SELECT user_id as "userId", username, email, theme, notifications, preferences, created_at, updated_at
       FROM user_settings
       WHERE user_id = $1`,
      [userId]
    );

    // If no settings exist, return default settings
    if (result.rows.length === 0) {
      const defaultSettings = {
        userId,
        username: 'User',
        email: req.user?.email || '',
        theme: 'light',
        notifications: {
          critical: true,
          daily: true,
          maintenance: true,
          email: true,
          sms: false,
          line: false,
        },
        preferences: {},
      };
      return res.json({ data: defaultSettings });
    }

    const settings = result.rows[0];

    // Parse JSON fields
    if (settings.notifications && typeof settings.notifications === 'string') {
      settings.notifications = JSON.parse(settings.notifications);
    }
    if (settings.preferences && typeof settings.preferences === 'string') {
      settings.preferences = JSON.parse(settings.preferences);
    }

    res.json({ data: settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * PUT /api/v1/settings
 * Update user settings
 */
router.put('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { username, email, theme, notifications, preferences } = req.body;

    // Check if settings exist
    const existingResult = await pool.query(
      'SELECT user_id FROM user_settings WHERE user_id = $1',
      [userId]
    );

    let result;

    if (existingResult.rows.length === 0) {
      // Insert new settings
      result = await pool.query(
        `INSERT INTO user_settings (user_id, username, email, theme, notifications, preferences, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING user_id as "userId", username, email, theme, notifications, preferences, created_at, updated_at`,
        [
          userId,
          username || 'User',
          email || '',
          theme || 'light',
          JSON.stringify(notifications || {}),
          JSON.stringify(preferences || {}),
        ]
      );
    } else {
      // Update existing settings
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (username !== undefined) {
        updates.push(`username = $${paramIndex++}`);
        values.push(username);
      }
      if (email !== undefined) {
        updates.push(`email = $${paramIndex++}`);
        values.push(email);
      }
      if (theme !== undefined) {
        updates.push(`theme = $${paramIndex++}`);
        values.push(theme);
      }
      if (notifications !== undefined) {
        updates.push(`notifications = $${paramIndex++}`);
        values.push(JSON.stringify(notifications));
      }
      if (preferences !== undefined) {
        updates.push(`preferences = $${paramIndex++}`);
        values.push(JSON.stringify(preferences));
      }

      updates.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());
      values.push(userId);

      result = await pool.query(
        `UPDATE user_settings
         SET ${updates.join(', ')}
         WHERE user_id = $${paramIndex}
         RETURNING user_id as "userId", username, email, theme, notifications, preferences, created_at, updated_at`,
        values
      );
    }

    const settings = result.rows[0];

    // Parse JSON fields
    if (settings.notifications && typeof settings.notifications === 'string') {
      settings.notifications = JSON.parse(settings.notifications);
    }
    if (settings.preferences && typeof settings.preferences === 'string') {
      settings.preferences = JSON.parse(settings.preferences);
    }

    res.json({ data: settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
