import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { DATA_DIR, MATERIALS_DIR, ROOT_DIR, UPLOADS_DIR, all, get, nowIso, run, transaction } from './db.js';

const app = express();
const SESSION_COOKIE = 'portal_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;
const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_MATERIAL_FILE_SIZE = 50 * 1024 * 1024;
const BCRYPT_ROUNDS = 12;
const APP_SECRET = process.env.APP_SECRET || 'change-this-secret-before-production';
const isProduction = process.env.NODE_ENV === 'production';

if (APP_SECRET === 'change-this-secret-before-production') {
  console.warn('APP_SECRET is using the default value. Change it before production use.');
}

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(MATERIALS_DIR, { recursive: true });

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

function jsonError(res, status, error) {
  return res.status(status).json({ error });
}

function sanitizeText(value, maxLength = 300) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

function sanitizeMultiline(value, maxLength = 2000) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeEmail(email) {
  return sanitizeText(email, 160).toLowerCase();
}

function createSlug(value) {
  return sanitizeText(value, 80)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function validatePassword(password) {
  const value = String(password || '');
  if (value.length < 10) {
    return 'La contrasena debe tener al menos 10 caracteres.';
  }

  const hasLetter = /[A-Za-z]/.test(value);
  const hasNumber = /\d/.test(value);
  if (!hasLetter || !hasNumber) {
    return 'La contrasena debe combinar letras y numeros.';
  }

  return '';
}

function isEmailValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function deriveKey() {
  return crypto.createHash('sha256').update(APP_SECRET).digest();
}

function encryptSecret(value) {
  if (!value) {
    return null;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

function decryptSecret(value) {
  if (!value) {
    return '';
  }

  const [ivValue, tagValue, encryptedValue] = String(value).split('.');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    deriveKey(),
    Buffer.from(ivValue, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

function hashToken(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function getCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction,
    path: '/',
    expires: new Date(expiresAt),
  };
}

function createRateLimiter({ windowMs, max, keyFn, message }) {
  const hits = new Map();

  return (req, res, next) => {
    const key = keyFn(req);
    const now = Date.now();
    const bucket = hits.get(key);

    if (!bucket || now - bucket.start > windowMs) {
      hits.set(key, { start: now, count: 1 });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > max) {
      return jsonError(res, 429, message);
    }

    return next();
  };
}

function ensureSameOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const origin = req.get('origin');
  if (!origin) {
    return next();
  }

  const expectedOrigin = `${req.protocol}://${req.get('host')}`;
  if (origin !== expectedOrigin) {
    return jsonError(res, 403, 'Origen no permitido.');
  }

  return next();
}

app.use(ensureSameOrigin);
app.use(
  '/api',
  createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 500,
    keyFn: (req) => req.ip,
    message: 'Demasiadas solicitudes. Intenta nuevamente en unos minutos.',
  }),
);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, UPLOADS_DIR),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname || '').toLowerCase();
      callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
    },
  }),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
  fileFilter: (_req, file, callback) => {
    const allowedMimeTypes = new Set([
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
      'text/plain',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
    ]);

    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new Error('Tipo de archivo no permitido.'));
    }

    return callback(null, true);
  },
});

const materialUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, MATERIALS_DIR),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname || '').toLowerCase();
      callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
    },
  }),
  limits: {
    fileSize: MAX_MATERIAL_FILE_SIZE,
    files: 1,
  },
});

function mapOrganization(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    slug: row.slug,
    nombre: row.name,
    telegramChatId: row.telegram_chat_id || '',
    telegramBotConfigured: Boolean(row.telegram_bot_token_encrypted),
    adminEmail: row.admin_email || '',
  };
}

function findOrganizationsForUser(user) {
  if (user.role === 'superadmin') {
    return all(
      `
        SELECT
          organizations.*,
          COALESCE(
            (
              SELECT email
              FROM users
              WHERE users.organization_id = organizations.id AND users.role = 'org_admin'
              LIMIT 1
            ),
            CASE WHEN organizations.id = ? THEN ? ELSE '' END
          ) AS admin_email
        FROM organizations
        ORDER BY organizations.name ASC
      `,
      user.organization_id || 0,
      user.email,
    ).map(mapOrganization);
  }

  const row = get(
    `
      SELECT organizations.*, users.email AS admin_email
      FROM organizations
      INNER JOIN users ON users.organization_id = organizations.id
      WHERE organizations.id = ? AND users.id = ?
      LIMIT 1
    `,
    user.organization_id,
    user.id,
  );
  return row ? [mapOrganization(row)] : [];
}

function getPublicOrganizationBySlug(slug) {
  const row = get(
    `
      SELECT id, slug, name, telegram_chat_id
      FROM organizations
      WHERE slug = ?
      LIMIT 1
    `,
    slug,
  );

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    slug: row.slug,
    nombre: row.name,
    telegramChatId: row.telegram_chat_id || '',
  };
}

function mapMaterial(row) {
  return {
    id: String(row.id),
    consultoriaId: String(row.consultoria_id),
    titulo: row.titulo,
    descripcion: row.descripcion || '',
    originalName: row.original_name,
    mimeType: row.mime_type,
    size: row.size,
    createdAt: row.created_at,
  };
}

function getMaterialsForConsultoria(organizationId, consultoriaId) {
  return all(
    `
      SELECT *
      FROM materiales
      WHERE organization_id = ? AND consultoria_id = ?
      ORDER BY datetime(created_at) DESC, id DESC
    `,
    organizationId,
    consultoriaId,
  ).map(mapMaterial);
}

function collectMaterialFilesByOrganization(organizationId) {
  return all('SELECT file_name FROM materiales WHERE organization_id = ?', organizationId).map(
    (row) => row.file_name,
  );
}

function collectMaterialFilesByConsultoria(organizationId, consultoriaId) {
  return all(
    'SELECT file_name FROM materiales WHERE organization_id = ? AND consultoria_id = ?',
    organizationId,
    consultoriaId,
  ).map((row) => row.file_name);
}

function deleteMaterialFiles(fileNames) {
  fileNames.forEach((fileName) => {
    if (!fileName || fileName.includes('/') || fileName.includes('\\')) {
      return;
    }

    const filePath = path.join(MATERIALS_DIR, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (error) => {
        if (error) {
          console.error('Could not delete material file:', error);
        }
      });
    }
  });
}

function getConsultoriasForOrganization(organizationId, includeInactive = false) {
  const rows = includeInactive
    ? all(
        `
          SELECT id, titulo, descripcion, activo, created_at
          FROM consultorias
          WHERE organization_id = ?
          ORDER BY created_at ASC, id ASC
        `,
        organizationId,
      )
    : all(
        `
          SELECT id, titulo, descripcion, activo, created_at
          FROM consultorias
          WHERE organization_id = ? AND activo = 1
          ORDER BY created_at ASC, id ASC
        `,
        organizationId,
      );

  return rows.map((row) => ({
    id: String(row.id),
    titulo: row.titulo,
    descripcion: row.descripcion,
    activo: Boolean(row.activo),
  }));
}

function createSession(user, req, res) {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  const now = nowIso();

  run(
    `
      INSERT INTO sessions (user_id, token_hash, expires_at, ip_address, user_agent, created_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    user.id,
    hashToken(rawToken),
    expiresAt,
    sanitizeText(req.ip, 80),
    sanitizeText(req.get('user-agent') || '', 300),
    now,
    now,
  );

  res.cookie(SESSION_COOKIE, rawToken, getCookieOptions(expiresAt));
}

function clearSession(res) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction,
    path: '/',
  });
}

function getAuthenticatedUser(req) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    return null;
  }

  const session = get(
    `
      SELECT sessions.id AS session_id, sessions.expires_at, users.*
      FROM sessions
      INNER JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ?
      LIMIT 1
    `,
    hashToken(token),
  );

  if (!session) {
    return null;
  }

  if (new Date(session.expires_at).getTime() < Date.now()) {
    run('DELETE FROM sessions WHERE id = ?', session.session_id);
    return null;
  }

  run('UPDATE sessions SET last_seen_at = ? WHERE id = ?', nowIso(), session.session_id);
  return session;
}

function requireAuth(req, res, next) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return jsonError(res, 401, 'Sesion no valida.');
  }

  req.user = user;
  return next();
}

function requireSuperadmin(req, res, next) {
  if (req.user.role !== 'superadmin') {
    return jsonError(res, 403, 'No tienes permisos para esta accion.');
  }

  return next();
}

function resolveOrganizationId(req) {
  const rawValue =
    req.query.organizationId ||
    req.body.organizationId ||
    req.params.organizationId ||
    req.params.id;
  const id = Number(rawValue);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function ensureOrganizationAccess(req, res, next) {
  const organizationId = resolveOrganizationId(req);

  if (!organizationId) {
    return jsonError(res, 400, 'Organizacion invalida.');
  }

  if (req.user.role !== 'superadmin' && req.user.organization_id !== organizationId) {
    return jsonError(res, 403, 'No tienes acceso a esta organizacion.');
  }

  req.organizationId = organizationId;
  return next();
}

async function sendTelegramNotification({ organizationId, solicitud }) {
  const organization = get(
    `
      SELECT telegram_bot_token_encrypted, telegram_chat_id
      FROM organizations
      WHERE id = ?
      LIMIT 1
    `,
    organizationId,
  );

  if (!organization?.telegram_bot_token_encrypted || !organization.telegram_chat_id) {
    return { skipped: true };
  }

  const token = decryptSecret(organization.telegram_bot_token_encrypted);
  const files = solicitud.archivos.length
    ? solicitud.archivos.map((file) => `- ${file.originalName} (${Math.ceil(file.size / 1024)} KB)`).join('\n')
    : 'Sin archivos adjuntos';

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: organization.telegram_chat_id,
      text: [
        'Nueva solicitud de asistencia',
        '',
        `Consultoria: ${solicitud.consultoria}`,
        `ONG solicitante: ${solicitud.nombreONGCliente}`,
        `Correo: ${solicitud.email}`,
        `Desea contacto telefonico: ${solicitud.contactoTelefonico ? 'Si' : 'No'}`,
        `Telefono: ${solicitud.telefono || 'No informado'}`,
        `Franja horaria: ${solicitud.franjaHoraria || 'No informada'}`,
        '',
        'Descripcion:',
        solicitud.descripcion,
        '',
        'Archivos adjuntos:',
        files,
      ].join('\n'),
    }),
  });

  if (!response.ok) {
    throw new Error('No se pudo enviar la notificacion a Telegram.');
  }

  return response.json();
}

app.get('/api/setup/status', (_req, res) => {
  const initialized = Boolean(get('SELECT id FROM users LIMIT 1'));
  res.json({ initialized });
});

app.post(
  '/api/setup',
  createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyFn: (req) => `setup:${req.ip}`,
    message: 'Demasiados intentos de configuracion inicial.',
  }),
  async (req, res) => {
    if (get('SELECT id FROM users LIMIT 1')) {
      return jsonError(res, 409, 'La aplicacion ya fue inicializada.');
    }

    const organizationName = sanitizeText(req.body.organizationName, 120);
    const organizationSlug = createSlug(req.body.organizationSlug || organizationName);
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!organizationName || !organizationSlug || !email || !password) {
      return jsonError(res, 400, 'Completa todos los campos obligatorios.');
    }

    if (!isEmailValid(email)) {
      return jsonError(res, 400, 'Correo invalido.');
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return jsonError(res, 400, passwordError);
    }

    const createdAt = nowIso();
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const result = transaction(() => {
      const organizationInsert = run(
        `
          INSERT INTO organizations (slug, name, created_at, updated_at)
          VALUES (?, ?, ?, ?)
        `,
        organizationSlug,
        organizationName,
        createdAt,
        createdAt,
      );

      const organizationId = Number(organizationInsert.lastInsertRowid);
      const userInsert = run(
        `
          INSERT INTO users (organization_id, email, password_hash, role, created_at, updated_at)
          VALUES (?, ?, ?, 'superadmin', ?, ?)
        `,
        organizationId,
        email,
        passwordHash,
        createdAt,
        createdAt,
      );

      return {
        id: Number(userInsert.lastInsertRowid),
        organization_id: organizationId,
        email,
      };
    });

    createSession(result, req, res);
    res.status(201).json({ ok: true });
  },
);

app.post(
  '/api/auth/login',
  createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 8,
    keyFn: (req) => `login:${req.ip}:${normalizeEmail(req.body.email)}`,
    message: 'Demasiados intentos de inicio de sesion. Espera unos minutos.',
  }),
  async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!email || !password) {
      return jsonError(res, 400, 'Ingresa correo y contrasena.');
    }

    const user = get(
      `
        SELECT id, organization_id, email, password_hash, role
        FROM users
        WHERE email = ?
        LIMIT 1
      `,
      email,
    );

    const passwordMatches = user ? await bcrypt.compare(password, user.password_hash) : false;
    if (!user || !passwordMatches) {
      return jsonError(res, 401, 'Credenciales invalidas.');
    }

    run('DELETE FROM sessions WHERE user_id = ?', user.id);
    createSession(user, req, res);
    return res.json({ ok: true });
  },
);

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) {
    run('DELETE FROM sessions WHERE token_hash = ?', hashToken(token));
  }

  clearSession(res);
  res.json({ ok: true });
});

app.get('/api/auth/session', (req, res) => {
  const initialized = Boolean(get('SELECT id FROM users LIMIT 1'));
  const user = getAuthenticatedUser(req);

  if (!user) {
    return res.json({ initialized, user: null, organizations: [] });
  }

  const organizations = findOrganizationsForUser(user);
  return res.json({
    initialized,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organization_id,
    },
    organizations,
  });
});

app.get('/api/public/organizations/:slug', (req, res) => {
  const organization = getPublicOrganizationBySlug(createSlug(req.params.slug));
  if (!organization) {
    return jsonError(res, 404, 'Organizacion no encontrada.');
  }

  return res.json({ organization });
});

app.get('/api/public/organizations', (_req, res) => {
  const organizations = all(
    `
      SELECT
        organizations.id,
        organizations.slug,
        organizations.name,
        COUNT(consultorias.id) AS consultorias_count
      FROM organizations
      LEFT JOIN consultorias
        ON consultorias.organization_id = organizations.id AND consultorias.activo = 1
      GROUP BY organizations.id
      ORDER BY organizations.name ASC
    `,
  ).map((row) => ({
    id: String(row.id),
    slug: row.slug,
    nombre: row.name,
    consultoriasCount: Number(row.consultorias_count || 0),
  }));

  return res.json({ organizations });
});

app.get('/api/public/organizations/:slug/consultorias', (req, res) => {
  const organization = getPublicOrganizationBySlug(createSlug(req.params.slug));
  if (!organization) {
    return jsonError(res, 404, 'Organizacion no encontrada.');
  }

  return res.json({ consultorias: getConsultoriasForOrganization(organization.id, false) });
});

app.get('/api/public/organizations/:slug/materiales/:consultoriaId', (req, res) => {
  const organization = getPublicOrganizationBySlug(createSlug(req.params.slug));
  const consultoriaId = Number(req.params.consultoriaId);
  if (!organization) {
    return jsonError(res, 404, 'Organizacion no encontrada.');
  }

  const consultoria = get(
    `
      SELECT id
      FROM consultorias
      WHERE id = ? AND organization_id = ? AND activo = 1
      LIMIT 1
    `,
    consultoriaId,
    organization.id,
  );

  if (!consultoria) {
    return jsonError(res, 404, 'Consultoria no encontrada.');
  }

  return res.json({ materiales: getMaterialsForConsultoria(organization.id, consultoriaId) });
});

app.get('/api/public/organizations/:slug/materiales/:materialId/download', (req, res) => {
  const organization = getPublicOrganizationBySlug(createSlug(req.params.slug));
  const materialId = Number(req.params.materialId);
  if (!organization) {
    return jsonError(res, 404, 'Organizacion no encontrada.');
  }

  const material = get(
    `
      SELECT materiales.*
      FROM materiales
      INNER JOIN consultorias ON consultorias.id = materiales.consultoria_id
      WHERE materiales.id = ?
        AND materiales.organization_id = ?
        AND consultorias.activo = 1
      LIMIT 1
    `,
    materialId,
    organization.id,
  );

  if (!material) {
    return jsonError(res, 404, 'Material no encontrado.');
  }

  return res.download(path.join(MATERIALS_DIR, material.file_name), material.original_name);
});

app.get('/api/public/organizations/:slug/materiales/:materialId/open', (req, res) => {
  const organization = getPublicOrganizationBySlug(createSlug(req.params.slug));
  const materialId = Number(req.params.materialId);
  if (!organization) {
    return jsonError(res, 404, 'Organizacion no encontrada.');
  }

  const material = get(
    `
      SELECT materiales.*
      FROM materiales
      INNER JOIN consultorias ON consultorias.id = materiales.consultoria_id
      WHERE materiales.id = ?
        AND materiales.organization_id = ?
        AND consultorias.activo = 1
      LIMIT 1
    `,
    materialId,
    organization.id,
  );

  if (!material) {
    return jsonError(res, 404, 'Material no encontrado.');
  }

  res.setHeader('Content-Type', material.mime_type || 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${String(material.original_name).replace(/"/g, '')}"`,
  );
  return res.sendFile(path.join(MATERIALS_DIR, material.file_name));
});

app.post(
  '/api/public/organizations/:slug/solicitudes',
  createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    keyFn: (req) => `solicitud:${req.ip}`,
    message: 'Demasiados envios. Intenta nuevamente en unos minutos.',
  }),
  upload.array('files', MAX_FILES),
  async (req, res) => {
    const organization = getPublicOrganizationBySlug(createSlug(req.params.slug));
    if (!organization) {
      return jsonError(res, 404, 'Organizacion no encontrada.');
    }

    const email = normalizeEmail(req.body.email);
    const nombreONGCliente = sanitizeText(req.body.nombreONGCliente, 120);
    const descripcion = sanitizeMultiline(req.body.descripcion, 3000);
    const telefono = sanitizeText(req.body.telefono, 40);
    const franjaHoraria = sanitizeText(req.body.franjaHoraria, 120);
    const consultoriaId = Number(req.body.consultoriaId);
    const contactoTelefonico = String(req.body.contactoTelefonico) === 'true';

    if (!isEmailValid(email) || !nombreONGCliente || !descripcion) {
      return jsonError(res, 400, 'Completa los campos obligatorios del formulario.');
    }

    const consultoria = get(
      `
        SELECT id, titulo
        FROM consultorias
        WHERE id = ? AND organization_id = ? AND activo = 1
        LIMIT 1
      `,
      consultoriaId,
      organization.id,
    );

    if (!consultoria) {
      return jsonError(res, 400, 'La consultoria seleccionada no esta disponible.');
    }

    const files = Array.isArray(req.files) ? req.files : [];
    const storedFiles = files.map((file) => ({
      fileName: file.filename,
      originalName: sanitizeText(file.originalname, 180),
      mimeType: file.mimetype,
      size: file.size,
    }));

    const createdAt = nowIso();
    const insertResult = run(
      `
        INSERT INTO solicitudes (
          organization_id,
          consultoria_id,
          nombre_consultoria,
          email,
          nombre_ong_cliente,
          descripcion,
          contacto_telefonico,
          telefono,
          franja_horaria,
          archivos_json,
          estado,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?)
      `,
      organization.id,
      consultoria.id,
      consultoria.titulo,
      email,
      nombreONGCliente,
      descripcion,
      contactoTelefonico ? 1 : 0,
      telefono,
      franjaHoraria,
      JSON.stringify(storedFiles),
      createdAt,
      createdAt,
    );

    try {
      await sendTelegramNotification({
        organizationId: organization.id,
        solicitud: {
          consultoria: consultoria.titulo,
          email,
          nombreONGCliente,
          descripcion,
          contactoTelefonico,
          telefono,
          franjaHoraria,
          archivos: storedFiles,
        },
      });
    } catch (error) {
      console.error('Telegram notification failed:', error);
    }

    return res.status(201).json({
      solicitud: {
        id: String(insertResult.lastInsertRowid),
      },
    });
  },
);

app.get('/api/admin/dashboard', requireAuth, ensureOrganizationAccess, (req, res) => {
  const consultoriasActivas = get(
    `
      SELECT COUNT(*) AS total
      FROM consultorias
      WHERE organization_id = ? AND activo = 1
    `,
    req.organizationId,
  ).total;
  const solicitudesPendientes = get(
    `
      SELECT COUNT(*) AS total
      FROM solicitudes
      WHERE organization_id = ? AND estado = 'pendiente'
    `,
    req.organizationId,
  ).total;
  const solicitudesTotales = get(
    `
      SELECT COUNT(*) AS total
      FROM solicitudes
      WHERE organization_id = ?
    `,
    req.organizationId,
  ).total;

  res.json({
    consultoriasActivas,
    solicitudesPendientes,
    solicitudesTotales,
  });
});

app.get('/api/admin/organizations', requireAuth, (req, res) => {
  const organizations = findOrganizationsForUser(req.user);
  res.json({ organizations });
});

app.post('/api/admin/organizations', requireAuth, requireSuperadmin, async (req, res) => {
  const nombre = sanitizeText(req.body.nombre, 120);
  const slug = createSlug(req.body.slug || nombre);
  const adminEmail = normalizeEmail(req.body.adminEmail);
  const adminPassword = String(req.body.adminPassword || '');
  const telegramChatId = sanitizeText(req.body.telegramChatId, 120);
  const telegramBotToken = sanitizeText(req.body.telegramBotToken, 200);

  if (!nombre || !slug || !adminEmail || !adminPassword) {
    return jsonError(res, 400, 'Completa nombre, slug, email y contrasena.');
  }

  if (!isEmailValid(adminEmail)) {
    return jsonError(res, 400, 'Correo del administrador invalido.');
  }

  const passwordError = validatePassword(adminPassword);
  if (passwordError) {
    return jsonError(res, 400, passwordError);
  }

  const existingOrganization = get('SELECT id FROM organizations WHERE slug = ? LIMIT 1', slug);
  if (existingOrganization) {
    return jsonError(res, 409, 'Ese slug ya esta en uso.');
  }

  const existingUser = get('SELECT id FROM users WHERE email = ? LIMIT 1', adminEmail);
  if (existingUser) {
    return jsonError(res, 409, 'Ese correo ya esta en uso.');
  }

  const createdAt = nowIso();
  const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);

  transaction(() => {
    const orgInsert = run(
      `
        INSERT INTO organizations (
          slug,
          name,
          telegram_bot_token_encrypted,
          telegram_chat_id,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      slug,
      nombre,
      telegramBotToken ? encryptSecret(telegramBotToken) : null,
      telegramChatId,
      createdAt,
      createdAt,
    );

    run(
      `
        INSERT INTO users (organization_id, email, password_hash, role, created_at, updated_at)
        VALUES (?, ?, ?, 'org_admin', ?, ?)
      `,
      Number(orgInsert.lastInsertRowid),
      adminEmail,
      passwordHash,
      createdAt,
      createdAt,
    );
  });

  return res.status(201).json({ ok: true });
});

app.patch('/api/admin/organizations/:id', requireAuth, ensureOrganizationAccess, async (req, res) => {
  const organization = get('SELECT * FROM organizations WHERE id = ? LIMIT 1', req.organizationId);
  if (!organization) {
    return jsonError(res, 404, 'Organizacion no encontrada.');
  }

  const nombre = sanitizeText(req.body.nombre || organization.name, 120);
  const slug = createSlug(req.body.slug || organization.slug);
  const telegramChatId = sanitizeText(req.body.telegramChatId ?? organization.telegram_chat_id ?? '', 120);
  const telegramBotToken = sanitizeText(req.body.telegramBotToken, 200);
  const adminEmail = req.body.adminEmail ? normalizeEmail(req.body.adminEmail) : '';
  const adminPassword = req.body.adminPassword ? String(req.body.adminPassword) : '';

  if (!nombre || !slug) {
    return jsonError(res, 400, 'Nombre y slug son obligatorios.');
  }

  const slugOwner = get(
    'SELECT id FROM organizations WHERE slug = ? AND id <> ? LIMIT 1',
    slug,
    req.organizationId,
  );
  if (slugOwner) {
    return jsonError(res, 409, 'Ese slug ya esta en uso.');
  }

  if (adminEmail && !isEmailValid(adminEmail)) {
    return jsonError(res, 400, 'Correo del administrador invalido.');
  }

  if (adminPassword) {
    const passwordError = validatePassword(adminPassword);
    if (passwordError) {
      return jsonError(res, 400, passwordError);
    }
  }

  const orgAdmin =
    get(
      `
        SELECT id, email
        FROM users
        WHERE organization_id = ? AND role = 'org_admin'
        LIMIT 1
      `,
      req.organizationId,
    ) ||
    (req.user.organization_id === req.organizationId
      ? get('SELECT id, email FROM users WHERE id = ? LIMIT 1', req.user.id)
      : null);

  transaction(() => {
    run(
      `
        UPDATE organizations
        SET name = ?, slug = ?, telegram_chat_id = ?, telegram_bot_token_encrypted = ?, updated_at = ?
        WHERE id = ?
      `,
      nombre,
      slug,
      telegramChatId,
      telegramBotToken
        ? encryptSecret(telegramBotToken)
        : organization.telegram_bot_token_encrypted,
      nowIso(),
      req.organizationId,
    );

    if (orgAdmin && (adminEmail || adminPassword)) {
      if (adminEmail) {
        const emailOwner = get(
          'SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1',
          adminEmail,
          orgAdmin.id,
        );
        if (emailOwner) {
          throw new Error('Ese correo ya esta en uso.');
        }
      }

      const updates = [];
      const params = [];

      if (adminEmail) {
        updates.push('email = ?');
        params.push(adminEmail);
      }

      if (adminPassword) {
        updates.push('password_hash = ?');
        params.push(bcrypt.hashSync(adminPassword, BCRYPT_ROUNDS));
      }

      updates.push('updated_at = ?');
      params.push(nowIso(), orgAdmin.id);

      run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, ...params);
    }
  });

  return res.json({ ok: true });
});

app.delete('/api/admin/organizations/:id', requireAuth, requireSuperadmin, (req, res) => {
  const organizationId = Number(req.params.id);
  if (!Number.isInteger(organizationId) || organizationId <= 0) {
    return jsonError(res, 400, 'Organizacion invalida.');
  }

  if (req.user.organization_id === organizationId) {
    return jsonError(res, 400, 'No puedes eliminar la organizacion asociada a tu usuario actual.');
  }

  const organization = get('SELECT id FROM organizations WHERE id = ? LIMIT 1', organizationId);
  if (!organization) {
    return jsonError(res, 404, 'Organizacion no encontrada.');
  }

  const fileNames = collectMaterialFilesByOrganization(organizationId);

  transaction(() => {
    run('DELETE FROM users WHERE organization_id = ?', organizationId);
    run('DELETE FROM organizations WHERE id = ?', organizationId);
  });

  deleteMaterialFiles(fileNames);
  return res.json({ ok: true });
});

app.get('/api/admin/consultorias', requireAuth, ensureOrganizationAccess, (req, res) => {
  res.json({ consultorias: getConsultoriasForOrganization(req.organizationId, true) });
});

app.post('/api/admin/consultorias', requireAuth, ensureOrganizationAccess, (req, res) => {
  const titulo = sanitizeText(req.body.titulo, 120);
  const descripcion = sanitizeMultiline(req.body.descripcion, 600);
  const activo = Boolean(req.body.activo);
  const id = req.body.id ? Number(req.body.id) : null;

  if (!titulo || !descripcion) {
    return jsonError(res, 400, 'Titulo y descripcion son obligatorios.');
  }

  const createdAt = nowIso();

  if (id) {
    const consultoria = get(
      'SELECT id FROM consultorias WHERE id = ? AND organization_id = ? LIMIT 1',
      id,
      req.organizationId,
    );
    if (!consultoria) {
      return jsonError(res, 404, 'Consultoria no encontrada.');
    }

    run(
      `
        UPDATE consultorias
        SET titulo = ?, descripcion = ?, activo = ?, updated_at = ?
        WHERE id = ? AND organization_id = ?
      `,
      titulo,
      descripcion,
      activo ? 1 : 0,
      createdAt,
      id,
      req.organizationId,
    );

    return res.json({
      consultoria: {
        id: String(id),
        titulo,
        descripcion,
        activo,
      },
    });
  }

  const insertResult = run(
    `
      INSERT INTO consultorias (organization_id, titulo, descripcion, activo, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    req.organizationId,
    titulo,
    descripcion,
    activo ? 1 : 0,
    createdAt,
    createdAt,
  );

  return res.status(201).json({
    consultoria: {
      id: String(insertResult.lastInsertRowid),
      titulo,
      descripcion,
      activo,
    },
  });
});

app.delete('/api/admin/consultorias/:id', requireAuth, (req, res, next) => {
  req.query.organizationId = req.body.organizationId || req.query.organizationId;
  next();
}, ensureOrganizationAccess, (req, res) => {
  const consultoriaId = Number(req.params.id);
  if (!Number.isInteger(consultoriaId) || consultoriaId <= 0) {
    return jsonError(res, 400, 'Consultoria invalida.');
  }

  const consultoria = get(
    'SELECT id FROM consultorias WHERE id = ? AND organization_id = ? LIMIT 1',
    consultoriaId,
    req.organizationId,
  );
  if (!consultoria) {
    return jsonError(res, 404, 'Consultoria no encontrada.');
  }

  const fileNames = collectMaterialFilesByConsultoria(req.organizationId, consultoriaId);
  run('DELETE FROM consultorias WHERE id = ? AND organization_id = ?', consultoriaId, req.organizationId);
  deleteMaterialFiles(fileNames);

  return res.json({ ok: true });
});

app.get('/api/admin/materiales', requireAuth, ensureOrganizationAccess, (req, res) => {
  const consultoriaId = Number(req.query.consultoriaId);
  if (!Number.isInteger(consultoriaId) || consultoriaId <= 0) {
    return jsonError(res, 400, 'Consultoria invalida.');
  }

  const consultoria = get(
    'SELECT id FROM consultorias WHERE id = ? AND organization_id = ? LIMIT 1',
    consultoriaId,
    req.organizationId,
  );
  if (!consultoria) {
    return jsonError(res, 404, 'Consultoria no encontrada.');
  }

  return res.json({ materiales: getMaterialsForConsultoria(req.organizationId, consultoriaId) });
});

app.post(
  '/api/admin/materiales',
  requireAuth,
  materialUpload.single('file'),
  (req, res, next) => {
    req.body.organizationId = req.body.organizationId || req.query.organizationId;
    next();
  },
  ensureOrganizationAccess,
  (req, res) => {
    const consultoriaId = Number(req.body.consultoriaId);
    const titulo = sanitizeText(req.body.titulo, 160);
    const descripcion = sanitizeMultiline(req.body.descripcion, 800);

    if (!req.file || !titulo || !consultoriaId) {
      return jsonError(res, 400, 'Completa titulo, consultoria y archivo.');
    }

    const consultoria = get(
      'SELECT id FROM consultorias WHERE id = ? AND organization_id = ? LIMIT 1',
      consultoriaId,
      req.organizationId,
    );
    if (!consultoria) {
      deleteMaterialFiles([req.file.filename]);
      return jsonError(res, 404, 'Consultoria no encontrada.');
    }

    const createdAt = nowIso();
    const result = run(
      `
        INSERT INTO materiales (
          organization_id,
          consultoria_id,
          titulo,
          descripcion,
          file_name,
          original_name,
          mime_type,
          size,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      req.organizationId,
      consultoriaId,
      titulo,
      descripcion,
      req.file.filename,
      sanitizeText(req.file.originalname, 180),
      sanitizeText(req.file.mimetype || 'application/octet-stream', 120),
      req.file.size,
      createdAt,
    );

    return res.status(201).json({
      material: {
        id: String(result.lastInsertRowid),
        consultoriaId: String(consultoriaId),
        titulo,
        descripcion,
        originalName: sanitizeText(req.file.originalname, 180),
        mimeType: sanitizeText(req.file.mimetype || 'application/octet-stream', 120),
        size: req.file.size,
        createdAt,
      },
    });
  },
);

app.delete('/api/admin/materiales/:id', requireAuth, (req, res, next) => {
  req.query.organizationId = req.body.organizationId || req.query.organizationId;
  next();
}, ensureOrganizationAccess, (req, res) => {
  const materialId = Number(req.params.id);
  if (!Number.isInteger(materialId) || materialId <= 0) {
    return jsonError(res, 400, 'Material invalido.');
  }

  const material = get(
    'SELECT * FROM materiales WHERE id = ? AND organization_id = ? LIMIT 1',
    materialId,
    req.organizationId,
  );

  if (!material) {
    return jsonError(res, 404, 'Material no encontrado.');
  }

  run('DELETE FROM materiales WHERE id = ? AND organization_id = ?', materialId, req.organizationId);
  deleteMaterialFiles([material.file_name]);

  return res.json({ ok: true });
});

app.get('/api/admin/solicitudes', requireAuth, ensureOrganizationAccess, (req, res) => {
  const solicitudes = all(
    `
      SELECT *
      FROM solicitudes
      WHERE organization_id = ?
      ORDER BY datetime(created_at) DESC, id DESC
    `,
    req.organizationId,
  ).map((row) => ({
    id: String(row.id),
    nombreConsultoria: row.nombre_consultoria,
    email: row.email,
    nombreONGCliente: row.nombre_ong_cliente,
    descripcion: row.descripcion,
    contactoTelefonico: Boolean(row.contacto_telefonico),
    telefono: row.telefono || '',
    franjaHoraria: row.franja_horaria || '',
    estado: row.estado,
    fechaCreacion: row.created_at,
    archivos: JSON.parse(row.archivos_json || '[]'),
  }));

  res.json({ solicitudes });
});

app.patch('/api/admin/solicitudes/:id/status', requireAuth, (req, res, next) => {
  req.query.organizationId = req.body.organizationId;
  next();
}, ensureOrganizationAccess, (req, res) => {
  const solicitudId = Number(req.params.id);
  const estado = sanitizeText(req.body.estado, 20);

  if (!['pendiente', 'en_proceso', 'finalizada'].includes(estado)) {
    return jsonError(res, 400, 'Estado invalido.');
  }

  const solicitud = get(
    `
      SELECT id
      FROM solicitudes
      WHERE id = ? AND organization_id = ?
      LIMIT 1
    `,
    solicitudId,
    req.organizationId,
  );

  if (!solicitud) {
    return jsonError(res, 404, 'Solicitud no encontrada.');
  }

  run(
    `
      UPDATE solicitudes
      SET estado = ?, updated_at = ?
      WHERE id = ?
    `,
    estado,
    nowIso(),
    solicitudId,
  );

  return res.json({ ok: true });
});

const distPath = path.join(ROOT_DIR, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    return res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((error, _req, res, _next) => {
  console.error(error);

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return jsonError(res, 400, 'Cada archivo debe pesar menos de 5 MB.');
    }

    return jsonError(res, 400, 'No se pudieron procesar los archivos adjuntos.');
  }

  return jsonError(res, 500, error.message || 'Error interno del servidor.');
});

export default app;
