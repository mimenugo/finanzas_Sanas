import prisma from '../config/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { exec } from 'child_process';
import { promisify } from 'util';
import { clearSettingsCache } from '../middlewares/settings.js';
import { google } from 'googleapis';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GOOGLE_SHEETS_KEYS = [
  'google_sheets_client_id',
  'google_sheets_client_secret',
  'google_sheets_redirect_uri',
  'google_sheets_spreadsheet_id',
  'google_sheets_range',
  'google_sheets_refresh_token',
  'google_sheets_connected_email',
  'google_sheets_connected_at',
];

const PAYMENT_IMPORT_HEADERS = [
  'folio_pago',
  'fecha_pago',
  'referencia_pago',
  'telefono_cliente',
  'numero_prestamo',
  'numero_cuota',
  'monto_pagado',
  'metodo_pago',
  'referencia_operacion',
  'banco_origen',
  'banco_destino',
  'estatus',
  'observaciones',
  'procesado',
];

const PAYMENT_IMPORT_CORE_FIELDS = [
  'folio_pago',
  'fecha_pago',
  'referencia_pago',
  'telefono_cliente',
  'numero_prestamo',
  'numero_cuota',
  'monto_pagado',
  'referencia_operacion',
];

const normalizeSheetHeader = (value) => String(value || '').trim().toLowerCase();
const normalizePhone = (value) => String(value || '').replace(/\D/g, '');

const phonesMatch = (storedPhone, inputPhone) => {
  const stored = normalizePhone(storedPhone);
  const input = normalizePhone(inputPhone);
  if (!stored || !input) return false;
  return stored === input || stored.endsWith(input) || input.endsWith(stored);
};

const parseSheetDate = (value) => {
  if (!value) return null;
  const text = String(value).trim();
  const iso = new Date(text);
  if (!Number.isNaN(iso.getTime())) return iso;

  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return null;
};

const readGoogleSheetRows = async () => {
  const config = await getSettingsMap(GOOGLE_SHEETS_KEYS);

  if (!config.google_sheets_client_id || !config.google_sheets_client_secret || !config.google_sheets_refresh_token) {
    const error = new Error('Falta conectar Google Sheets con OAuth');
    error.statusCode = 400;
    throw error;
  }

  if (!config.google_sheets_spreadsheet_id || !config.google_sheets_range) {
    const error = new Error('Falta capturar Spreadsheet ID y rango');
    error.statusCode = 400;
    throw error;
  }

  const oauth2Client = buildGoogleOAuthClient(config);
  oauth2Client.setCredentials({ refresh_token: config.google_sheets_refresh_token });

  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.google_sheets_spreadsheet_id,
    range: config.google_sheets_range,
  });

  return response.data.values || [];
};

const mapSheetRows = (rows) => {
  const headers = rows[0] || [];
  const normalizedHeaders = headers.map(normalizeSheetHeader);
  const dataRows = rows
    .slice(1)
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => row.some((cell) => String(cell || '').trim()));

  return {
    headers,
    normalizedHeaders,
    missingHeaders: PAYMENT_IMPORT_HEADERS.filter((header) => !normalizedHeaders.includes(header)),
    records: dataRows.map(({ row, rowNumber }) => {
      const record = {};
      normalizedHeaders.forEach((header, cellIndex) => {
        record[header] = row[cellIndex] || '';
      });
      return { rowNumber, record, raw: row };
    }).filter(({ record }) => (
      PAYMENT_IMPORT_CORE_FIELDS.some((field) => String(record[field] || '').trim())
    )),
  };
};

const getSettingsMap = async (keys) => {
  const rows = await prisma.settings.findMany({ where: { key: { in: keys } } });
  return rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
};

const upsertSetting = (key, value, category = 'google') => {
  const stringValue = value === null || value === undefined ? '' : String(value);
  return prisma.settings.upsert({
    where: { key },
    update: { value: stringValue, updatedAt: new Date() },
    create: { key, value: stringValue, category },
  });
};

const buildGoogleOAuthClient = (config) => {
  const defaultRedirectUri = `${process.env.API_PUBLIC_URL || 'http://localhost:5000'}/api/settings/google-sheets/oauth/callback`;
  const redirectUri = config.google_sheets_redirect_uri || defaultRedirectUri;
  return new google.auth.OAuth2(
    config.google_sheets_client_id,
    config.google_sheets_client_secret,
    redirectUri
  );
};

// GET /api/settings/public
export const getPublicSettings = async (req, res) => {
  try {
    const settings = await prisma.settings.findMany({
      where: {
        category: {
          in: ['company', 'rates', 'system', 'appearance']
        }
      }
    });

    const grouped = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = {};
      }
      
      let value = setting.value;
      try {
        value = JSON.parse(value);
      } catch (e) {
        // No es JSON, mantener como string
      }
      
      acc[setting.category][setting.key] = value;
      return acc;
    }, {});

    // Ocultar password SMTP
    if (grouped.notifications) {
      delete grouped.notifications.smtp_password;
    }

    res.json(grouped);
  } catch (error) {
    console.error('Error fetching public settings:', error);
    res.status(500).json({ message: 'Error al obtener configuración' });
  }
};

// GET /api/settings
export const getAllSettings = async (req, res) => {
  try {
    const settings = await prisma.settings.findMany({
      orderBy: { category: 'asc' },
    });

    const grouped = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = {};
      }
      
      let value = setting.value;
      try {
        value = JSON.parse(value);
      } catch (e) {
        // No es JSON
      }
      
      acc[setting.category][setting.key] = value;
      return acc;
    }, {});

    res.json(grouped);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Error al obtener configuración' });
  }
};

// PUT /api/settings - CORREGIDO CON UPSERT
export const updateSettings = async (req, res) => {
  try {
    const updates = req.body;

    // Usar UPSERT en lugar de UPDATE para evitar error P2025
    const updatePromises = Object.entries(updates).map(([key, value]) => {
      const finalValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      
      // Extraer categoría del key (company_name → company)
      const category = key.split('_')[0];
      
      return prisma.settings.upsert({
        where: { key },
        update: { 
          value: finalValue,
          updatedAt: new Date()
        },
        create: { 
          key,
          value: finalValue,
          category
        }
      });
    });

    await Promise.all(updatePromises);
    clearSettingsCache();

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE',
        module: 'Settings',
        details: `Actualizó ${Object.keys(updates).length} configuraciones`,
        ipAddress: req.ip,
      },
    });

    res.json({ message: 'Configuración actualizada exitosamente' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ 
      message: 'Error al actualizar configuración',
      error: error.message 
    });
  }
};

// POST /api/settings/upload-logo
export const uploadLogo = async (req, res) => {
  try {
    if (!req.files || !req.files.logo) {
      return res.status(400).json({ message: 'No se recibió ningún archivo' });
    }

    const logo = req.files.logo;

    if (logo.size > 500 * 1024) {
      return res.status(400).json({ message: 'El logo no debe superar 500KB' });
    }

    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(logo.mimetype)) {
      return res.status(400).json({ message: 'Solo se permiten imágenes JPG o PNG' });
    }

    const uploadDir = path.join(__dirname, '../../uploads/company');
    await fs.mkdir(uploadDir, { recursive: true });

    const fileName = `logo-${Date.now()}${path.extname(logo.name)}`;
    const filePath = path.join(uploadDir, fileName);

    await logo.mv(filePath);

    const logoUrl = `/uploads/company/${fileName}`;

    // Usar UPSERT
    await prisma.settings.upsert({
      where: { key: 'company_logo' },
      update: { 
        value: logoUrl,
        updatedAt: new Date()
      },
      create: { 
        key: 'company_logo',
        value: logoUrl,
        category: 'company'
      }
    });

    clearSettingsCache();

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE',
        module: 'Settings',
        details: 'Actualizó el logo de la empresa',
        ipAddress: req.ip,
      },
    });

    res.json({ logoUrl, message: 'Logo actualizado exitosamente' });
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({ message: 'Error al subir el logo' });
  }
};

// POST /api/settings/test-smtp
export const testSmtpConnection = async (req, res) => {
  try {
    const { host, port, user, password } = req.body;

    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: port == 465,
      auth: { user, pass: password },
    });

    await transporter.verify();

    res.json({ success: true, message: 'Conexión SMTP exitosa' });
  } catch (error) {
    console.error('SMTP test failed:', error);
    const rawMessage = error.message || '';
    const lowerMessage = rawMessage.toLowerCase();
    const host = String(req.body?.host || '').toLowerCase();

    let message = rawMessage;
    let recommendation = null;

    if (
      lowerMessage.includes('basic authentication is disabled') ||
      lowerMessage.includes('authentication unsuccessful') ||
      lowerMessage.includes('535 5.7.139')
    ) {
      message = 'El proveedor rechazo el inicio de sesion SMTP porque la autenticacion basica esta deshabilitada.';
      recommendation = host.includes('outlook') || host.includes('office365')
        ? 'Para Outlook/Hotmail/Microsoft 365 debes habilitar Authenticated SMTP para ese buzon o usar un proveedor SMTP con contraseña de aplicacion/API. Si es Microsoft 365, prueba con smtp.office365.com, puerto 587, STARTTLS y verifica que Authenticated SMTP este activo.'
        : 'Verifica que el proveedor permita SMTP con usuario y contraseña o usa una contraseña de aplicacion/API.';
    } else if (lowerMessage.includes('invalid login') || lowerMessage.includes('auth')) {
      message = 'El servidor SMTP rechazo el usuario o la contraseña.';
      recommendation = 'Verifica usuario, contraseña, puerto y si el proveedor requiere contraseña de aplicacion.';
    } else if (lowerMessage.includes('enotfound') || lowerMessage.includes('econnrefused') || lowerMessage.includes('etimedout')) {
      message = 'No se pudo conectar con el servidor SMTP.';
      recommendation = 'Verifica servidor, puerto, firewall y conexion a internet.';
    }

    res.json({
      success: false,
      message,
      recommendation,
      rawMessage,
    });
  }
};

export const saveGoogleSheetsConfig = async (req, res) => {
  try {
    const {
      clientId,
      clientSecret,
      redirectUri,
      spreadsheetId,
      range,
    } = req.body;

    if (clientId && !String(clientId).includes('.apps.googleusercontent.com')) {
      return res.status(400).json({
        message: 'Google Client ID debe ser el valor completo que termina en .apps.googleusercontent.com',
      });
    }

    await Promise.all([
      upsertSetting('google_sheets_client_id', clientId),
      upsertSetting('google_sheets_client_secret', clientSecret),
      upsertSetting('google_sheets_redirect_uri', redirectUri || `${process.env.API_PUBLIC_URL || 'http://localhost:5000'}/api/settings/google-sheets/oauth/callback`),
      upsertSetting('google_sheets_spreadsheet_id', spreadsheetId),
      upsertSetting('google_sheets_range', range || 'Pagos!A:N'),
    ]);

    clearSettingsCache();

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE',
        module: 'Settings',
        details: 'Actualizo configuracion de Google Sheets',
        ipAddress: req.ip,
      },
    });

    res.json({ message: 'Configuracion de Google Sheets guardada' });
  } catch (error) {
    console.error('Save Google Sheets config error:', error);
    res.status(500).json({ message: 'Error al guardar configuracion de Google Sheets' });
  }
};

export const getGoogleSheetsAuthUrl = async (req, res) => {
  try {
    const config = await getSettingsMap(GOOGLE_SHEETS_KEYS);

    if (!config.google_sheets_client_id || !config.google_sheets_client_secret) {
      return res.status(400).json({ message: 'Primero captura Client ID y Client Secret de Google OAuth' });
    }

    const oauth2Client = buildGoogleOAuthClient(config);
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    res.json({ authUrl });
  } catch (error) {
    console.error('Google Sheets auth URL error:', error);
    res.status(500).json({ message: 'No se pudo generar URL de autorizacion de Google' });
  }
};

export const googleSheetsOAuthCallback = async (req, res) => {
  try {
    const { code, error } = req.query;

    if (error) {
      return res.status(400).send(`Google rechazo la autorizacion: ${error}`);
    }

    if (!code) {
      return res.status(400).send('No se recibio codigo de autorizacion de Google');
    }

    const config = await getSettingsMap(GOOGLE_SHEETS_KEYS);
    const oauth2Client = buildGoogleOAuthClient(config);
    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);

    let connectedEmail = '';
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const profile = await oauth2.userinfo.get();
      connectedEmail = profile.data.email || '';
    } catch (profileError) {
      connectedEmail = '';
    }

    if (tokens.refresh_token) {
      await upsertSetting('google_sheets_refresh_token', tokens.refresh_token);
    }

    await Promise.all([
      upsertSetting('google_sheets_connected_email', connectedEmail),
      upsertSetting('google_sheets_connected_at', new Date().toISOString()),
    ]);

    res.send(`
      <html>
        <head><title>Google Sheets conectado</title></head>
        <body style="font-family: Arial, sans-serif; padding: 32px;">
          <h2>Google Sheets conectado correctamente</h2>
          <p>Ya puedes cerrar esta ventana y regresar al sistema.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Google Sheets OAuth callback error:', error);
    res.status(500).send('No se pudo completar la conexion con Google Sheets');
  }
};

export const testGoogleSheetsConnection = async (req, res) => {
  try {
    const config = await getSettingsMap(GOOGLE_SHEETS_KEYS);

    if (!config.google_sheets_client_id || !config.google_sheets_client_secret || !config.google_sheets_refresh_token) {
      return res.status(400).json({ message: 'Falta conectar Google Sheets con OAuth' });
    }

    if (!config.google_sheets_spreadsheet_id || !config.google_sheets_range) {
      return res.status(400).json({ message: 'Falta capturar Spreadsheet ID y rango' });
    }

    const oauth2Client = buildGoogleOAuthClient(config);
    oauth2Client.setCredentials({ refresh_token: config.google_sheets_refresh_token });

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: config.google_sheets_spreadsheet_id,
      fields: 'sheets.properties.title',
    });
    const availableSheets = spreadsheet.data.sheets?.map((sheet) => sheet.properties?.title).filter(Boolean) || [];

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.google_sheets_spreadsheet_id,
      range: config.google_sheets_range,
    });

    const rows = response.data.values || [];
    res.json({
      success: true,
      message: 'Conexion exitosa con Google Sheets',
      connectedEmail: config.google_sheets_connected_email || null,
      availableSheets,
      totalRows: rows.length,
      headers: rows[0] || [],
      preview: rows.slice(1, 6),
    });
  } catch (error) {
    console.error('Google Sheets test error:', error);
    let availableSheets = [];

    try {
      const config = await getSettingsMap(GOOGLE_SHEETS_KEYS);
      if (config.google_sheets_client_id && config.google_sheets_client_secret && config.google_sheets_refresh_token && config.google_sheets_spreadsheet_id) {
        const oauth2Client = buildGoogleOAuthClient(config);
        oauth2Client.setCredentials({ refresh_token: config.google_sheets_refresh_token });
        const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
        const spreadsheet = await sheets.spreadsheets.get({
          spreadsheetId: config.google_sheets_spreadsheet_id,
          fields: 'sheets.properties.title',
        });
        availableSheets = spreadsheet.data.sheets?.map((sheet) => sheet.properties?.title).filter(Boolean) || [];
      }
    } catch (sheetError) {
      availableSheets = [];
    }

    res.status(500).json({
      success: false,
      message: error.message || 'No se pudo leer la hoja de Google Sheets',
      availableSheets,
    });
  }
};

export const downloadPaymentsTemplate = async (req, res) => {
  const headers = [
    'folio_pago',
    'fecha_pago',
    'referencia_pago',
    'telefono_cliente',
    'numero_prestamo',
    'numero_cuota',
    'monto_pagado',
    'metodo_pago',
    'referencia_operacion',
    'banco_origen',
    'banco_destino',
    'estatus',
    'observaciones',
    'procesado',
  ];

  const sample = [
    'WA-0001',
    '2026-07-29',
    'CRD450809533678',
    '6645812107',
    '6',
    '2',
    '1100.00',
    'TRANSFERENCIA',
    '88442211',
    'BBVA',
    'Banco Demo',
    'CONFIRMADO',
    'Pago reportado por WhatsApp',
    'NO',
  ];

  const csv = `${headers.join(',')}\n${sample.join(',')}\n`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla_importacion_pagos_google_sheets.csv"');
  res.send(csv);
};

export const importValidGoogleSheetPayments = async (req, res) => {
  try {
    const rows = await readGoogleSheetRows();
    const { headers, missingHeaders, records } = mapSheetRows(rows);

    if (!headers.length) {
      return res.status(400).json({ message: 'La hoja no tiene encabezados' });
    }

    if (missingHeaders.length) {
      return res.status(400).json({
        message: 'La hoja no coincide con la plantilla esperada',
        missingHeaders,
      });
    }

    const results = [];
    let imported = 0;
    let skipped = 0;
    let invalid = 0;

    for (const item of records) {
      const row = item.record;
      const rowErrors = [];
      const processed = normalizeSheetHeader(row.procesado);
      const status = normalizeSheetHeader(row.estatus);
      const folio = String(row.folio_pago || '').trim();
      const sheetReference = String(row.referencia_pago || '').trim();
      const operationReference = String(row.referencia_operacion || '').trim();
      const loanId = parseInt(row.numero_prestamo, 10);
      const installmentNumber = parseInt(row.numero_cuota, 10);
      const amount = parseFloat(String(row.monto_pagado || '').replace(/,/g, ''));
      const paymentDate = parseSheetDate(row.fecha_pago);
      const method = String(row.metodo_pago || 'TRANSFERENCIA').trim().toUpperCase();

      if (processed === 'si' || processed === 'sí' || processed === 'procesado') {
        skipped += 1;
        results.push({ rowNumber: item.rowNumber, status: 'SKIPPED', message: 'Fila marcada como procesada' });
        continue;
      }

      if (status !== 'confirmado') rowErrors.push('El estatus debe ser CONFIRMADO');
      if (!folio && !sheetReference && !operationReference) rowErrors.push('Falta folio_pago, referencia_pago o referencia_operacion');
      if (!row.telefono_cliente) rowErrors.push('Falta telefono_cliente');
      if (!loanId) rowErrors.push('numero_prestamo invalido');
      if (!installmentNumber) rowErrors.push('numero_cuota invalido');
      if (!amount || amount <= 0) rowErrors.push('monto_pagado invalido');
      if (!paymentDate) rowErrors.push('fecha_pago invalida');

      if (rowErrors.length) {
        invalid += 1;
        results.push({ rowNumber: item.rowNumber, status: 'INVALID', message: rowErrors.join('; ') });
        continue;
      }

      const duplicate = await prisma.payment.findFirst({
        where: {
          OR: [
            ...(folio ? [{ reference: folio }] : []),
            ...(sheetReference ? [{ reference: sheetReference }] : []),
            ...(operationReference ? [{ reference: operationReference }] : []),
          ],
        },
      });

      const duplicateTransaction = await prisma.paymentTransaction.findFirst({
        where: {
          OR: [
            ...(folio ? [{ reference: folio }, { providerTransactionId: folio }] : []),
            ...(sheetReference ? [{ reference: sheetReference }, { providerTransactionId: sheetReference }] : []),
            ...(operationReference ? [{ reference: operationReference }, { providerTransactionId: operationReference }] : []),
          ],
        },
      });

      if (duplicate || duplicateTransaction) {
        skipped += 1;
        results.push({ rowNumber: item.rowNumber, status: 'SKIPPED', message: 'Pago duplicado por folio o referencia' });
        continue;
      }

      const loan = await prisma.loan.findUnique({
        where: { id: loanId },
        include: {
          customer: true,
          installments: { orderBy: { installmentNumber: 'asc' } },
        },
      });

      if (!loan) rowErrors.push('Prestamo no encontrado');
      if (loan && !phonesMatch(loan.customer.phone, row.telefono_cliente)) rowErrors.push('El telefono no coincide con el cliente del prestamo');
      if (loan && loan.status !== 'ACTIVE') rowErrors.push('El prestamo no esta activo');

      const installment = loan?.installments.find((entry) => entry.installmentNumber === installmentNumber);
      if (!installment) rowErrors.push('Cuota no encontrada');
      if (installment?.status === 'PAID') rowErrors.push('La cuota ya esta pagada');

      const dueAmount = installment ? parseFloat(installment.total) + parseFloat(installment.lateFee || 0) : 0;
      if (installment && amount < dueAmount - 0.005) {
        rowErrors.push(`El monto no cubre la cuota completa. Requerido: ${dueAmount.toFixed(2)}`);
      }

      if (rowErrors.length) {
        invalid += 1;
        results.push({ rowNumber: item.rowNumber, status: 'INVALID', message: rowErrors.join('; ') });
        continue;
      }

      const reference = operationReference || sheetReference || folio;

      await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            loanId: loan.id,
            amount,
            paymentDate,
            paymentMethod: method,
            reference,
            observations: row.observaciones || 'Pago importado desde Google Sheets',
            collectedBy: req.user.id,
          },
        });

        await tx.paymentInstallment.create({
          data: {
            paymentId: payment.id,
            installmentId: installment.id,
            amount: dueAmount,
          },
        });

        await tx.installment.update({
          where: { id: installment.id },
          data: {
            status: 'PAID',
            paidAt: paymentDate,
            paidAmount: dueAmount,
          },
        });

        const newBalance = Math.max(0, parseFloat(loan.balance) - parseFloat(installment.principal));
        const pendingAfterPayment = await tx.installment.count({
          where: {
            loanId: loan.id,
            status: { in: ['PENDING', 'OVERDUE'] },
            id: { not: installment.id },
          },
        });

        await tx.loan.update({
          where: { id: loan.id },
          data: {
            balance: newBalance < 0.01 ? 0 : newBalance,
            status: (newBalance < 0.01 || pendingAfterPayment === 0) ? 'PAID' : 'ACTIVE',
          },
        });

        await tx.paymentTransaction.create({
          data: {
            folio: folio || `GS-${Date.now()}-${item.rowNumber}`,
            loanId: loan.id,
            customerId: loan.customerId,
            paymentId: payment.id,
            amount,
            status: 'CONFIRMED',
            providerTransactionId: operationReference || folio,
            reference,
            providerResponse: {
              source: 'GOOGLE_SHEETS',
              rowNumber: item.rowNumber,
              row,
            },
            notes: 'Pago importado manualmente desde Google Sheets',
            createdBy: req.user.id,
            confirmedAt: paymentDate,
          },
        });
      });

      imported += 1;
      results.push({
        rowNumber: item.rowNumber,
        status: 'IMPORTED',
        message: `Pago aplicado al prestamo ${loan.id}, cuota ${installment.installmentNumber}`,
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'IMPORT',
        module: 'Settings',
        details: `Importacion Google Sheets: ${imported} importados, ${skipped} omitidos, ${invalid} invalidos`,
        ipAddress: req.ip,
      },
    });

    res.json({
      message: 'Importacion de pagos finalizada',
      summary: { imported, skipped, invalid, total: records.length },
      results,
    });
  } catch (error) {
    console.error('Import Google Sheets payments error:', error);
    res.status(error.statusCode || 500).json({
      message: error.message || 'No se pudieron importar pagos desde Google Sheets',
    });
  }
};

// POST /api/settings/backup - CORREGIDO
export const generateBackup = async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${timestamp}.sql`;
    const backupDir = path.join(__dirname, '../../backups');
    
    await fs.mkdir(backupDir, { recursive: true });
    
    const filePath = path.join(backupDir, fileName);

    const dbUrl = process.env.DATABASE_URL;
    const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    
    if (!match) {
      throw new Error('DATABASE_URL inválida');
    }

    const [, user, password, host, port, database] = match;

    // CORREGIDO: Agregar --no-defaults para ignorar archivos de configuración
    const command = `mysqldump --no-defaults -h ${host} -P ${port} -u ${user} -p${password} ${database} > "${filePath}"`;
    
    console.log('Generando backup...');
    
    await execPromise(command);

    // Verificar que el archivo se creó y no está vacío
    const stats = await fs.stat(filePath);
    if (stats.size === 0) {
      throw new Error('El archivo de backup está vacío');
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'BACKUP',
        module: 'Settings',
        details: `Generó backup: ${fileName} (${(stats.size / 1024).toFixed(2)} KB)`,
        ipAddress: req.ip,
      },
    });

    res.json({ 
      success: true, 
      fileName,
      size: stats.size,
      message: 'Backup generado exitosamente',
      downloadUrl: `/api/settings/backup/download/${fileName}`
    });
  } catch (error) {
    console.error('Error generating backup:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al generar backup: ' + error.message 
    });
  }
};

// GET /api/settings/backups
export const listBackups = async (req, res) => {
  try {
    const backupDir = path.join(__dirname, '../../backups');
    
    try {
      const files = await fs.readdir(backupDir);
      const backups = await Promise.all(
        files
          .filter(file => file.endsWith('.sql'))
          .map(async (file) => {
            const stats = await fs.stat(path.join(backupDir, file));
            return {
              fileName: file,
              size: stats.size,
              createdAt: stats.birthtime,
              downloadUrl: `/api/settings/backup/download/${file}`
            };
          })
      );

      backups.sort((a, b) => b.createdAt - a.createdAt);
      res.json(backups);
    } catch (error) {
      res.json([]);
    }
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({ message: 'Error al listar backups' });
  }
};

// GET /api/settings/backup/download/:fileName
export const downloadBackup = async (req, res) => {
  try {
    const { fileName } = req.params;
    const filePath = path.join(__dirname, '../../backups', fileName);

    await fs.access(filePath);

    res.download(filePath);
  } catch (error) {
    res.status(404).json({ message: 'Backup no encontrado' });
  }
};

// DELETE /api/settings/backup/:fileName
export const deleteBackup = async (req, res) => {
  try {
    const { fileName } = req.params;
    const filePath = path.join(__dirname, '../../backups', fileName);

    await fs.unlink(filePath);

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE',
        module: 'Settings',
        details: `Eliminó backup: ${fileName}`,
        ipAddress: req.ip,
      },
    });

    res.json({ message: 'Backup eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar backup' });
  }
};

// POST /api/settings/seed-defaults
export const seedDefaults = async (req, res) => {
  try {
    const defaults = [
      // COMPANY
      { key: 'company_name', value: 'CrediManager', category: 'company' },
      { key: 'company_legal_name', value: 'CrediManager S.A.', category: 'company' },
      { key: 'company_ruc', value: '', category: 'company' },
      { key: 'company_address', value: '', category: 'company' },
      { key: 'company_phone', value: '', category: 'company' },
      { key: 'company_email', value: '', category: 'company' },
      { key: 'company_logo', value: '', category: 'company' },
      
      // RATES
      { key: 'rate_interest_default', value: '2.5', category: 'rates' },
      { key: 'rate_calculation_method', value: 'compound', category: 'rates' },
      { key: 'rate_late_fee_rate', value: '2.0', category: 'rates' },
      { key: 'rate_late_fee_on', value: 'OVERDUE_INSTALLMENT', category: 'rates' },
      { key: 'rate_grace_days', value: '0', category: 'rates' },
      { key: 'loan_amount_min', value: '100', category: 'rates' },
      { key: 'loan_amount_max', value: '50000', category: 'rates' },
      { key: 'loan_term_min', value: '1', category: 'rates' },
      { key: 'loan_term_max', value: '52', category: 'rates' },
      { key: 'rate_frequencies', value: JSON.stringify(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']), category: 'rates' },
      
      // SYSTEM
      { key: 'system_timezone', value: 'America/Lima', category: 'system' },
      { key: 'system_currency', value: 'USD', category: 'system' },
      { key: 'system_locale', value: 'en-US', category: 'system' },
      { key: 'system_date_format', value: 'DD/MM/YYYY', category: 'system' },
      { key: 'system_number_format', value: '1,000.00', category: 'system' },
    ];
    
    // Usar UPSERT para crear solo si no existen
    const results = await Promise.all(
      defaults.map(async ({ key, value, category }) => {
        return await prisma.settings.upsert({
          where: { key },
          update: {},
          create: { key, value, category }
        });
      })
    );

    clearSettingsCache();
    
    res.json({ 
      message: 'Configuraciones inicializadas correctamente',
      created: results.length 
    });
  } catch (error) {
    console.error('Error seeding defaults:', error);
    res.status(500).json({ 
      message: 'Error al inicializar configuraciones',
      error: error.message 
    });
  }
};
