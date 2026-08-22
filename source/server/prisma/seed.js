import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedUsers() {
  console.log(' Seeding users...');

  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@creditmanager.com' },
    update: {},
    create: {
      email: 'admin@creditmanager.com',
      password: hashedPassword,
      fullName: 'Administrador',
      role: 'ADMIN',
      status: 'ACTIVE',
      phone: '999999999'
    }
  });

  const collectorPassword = await bcrypt.hash('cobrador123', 10);
  
  const collector = await prisma.user.upsert({
    where: { email: 'cobrador@creditmanager.com' },
    update: {},
    create: {
      email: 'cobrador@creditmanager.com',
      password: collectorPassword,
      fullName: 'Juan Cobrador',
      role: 'COBRADOR',
      status: 'ACTIVE',
      phone: '888888888'
    }
  });

  const analystPassword = await bcrypt.hash('analista123', 10);
  
  const analyst = await prisma.user.upsert({
    where: { email: 'analista@creditmanager.com' },
    update: {},
    create: {
      email: 'analista@creditmanager.com',
      password: analystPassword,
      fullName: 'Maria Analista',
      role: 'ANALISTA',
      status: 'ACTIVE',
      phone: '777777777'
    }
  });

  console.log(' Users seeded');
}

async function seedSettings() {
  console.log(' Seeding settings...');

  const defaultSettings = [
    // EMPRESA
    { key: 'company_name', value: 'Finanzas Sanas', category: 'company' },
    { key: 'company_legal_name', value: 'Portal Finanzas Sanas y Bienestar Financiero', category: 'company' },
    { key: 'company_tax_id', value: '', category: 'company' },
    { key: 'company_address', value: '', category: 'company' },
    { key: 'company_phone', value: '', category: 'company' },
    { key: 'company_phone_secondary', value: '', category: 'company' },
    { key: 'company_email', value: 'info@credimanager.com', category: 'company' },
    { key: 'company_website', value: '', category: 'company' },
    { key: 'company_logo', value: '', category: 'company' },
    { key: 'company_social_facebook', value: '', category: 'company' },
    { key: 'company_social_instagram', value: '', category: 'company' },
    { key: 'company_social_linkedin', value: '', category: 'company' },

    // TASAS Y CÁLCULOS
    { key: 'rate_interest_annual', value: '20', category: 'rates' },
    { key: 'rate_calculation_method', value: 'compound', category: 'rates' },
    { key: 'rate_frequencies', value: JSON.stringify(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']), category: 'rates' },
    { key: 'rate_late_fee_daily', value: '0.1', category: 'rates' },
    { key: 'rate_grace_days', value: '0', category: 'rates' },
    { key: 'rate_late_fee_on', value: 'installment', category: 'rates' },
    { key: 'rate_late_fee_max_percent', value: '50', category: 'rates' },
    { key: 'loan_amount_min', value: '100', category: 'rates' },
    { key: 'loan_amount_max', value: '50000', category: 'rates' },
    { key: 'loan_term_min', value: '1', category: 'rates' },
    { key: 'loan_term_max', value: '36', category: 'rates' },

    // SISTEMA
    { key: 'system_timezone', value: 'America/Lima', category: 'system' },
    { key: 'system_currency_symbol', value: '$', category: 'system' },
    { key: 'system_currency_code', value: 'USD', category: 'system' },
    { key: 'system_date_format', value: 'DD/MM/YYYY', category: 'system' },
    { key: 'system_number_format', value: 'comma', category: 'system' },
    { key: 'system_language', value: 'es', category: 'system' },

    // APARIENCIA
    { key: 'app_theme', value: 'aurora-ledger', category: 'appearance' },

    // NOTIFICACIONES
    { key: 'notifications_email_enabled', value: 'false', category: 'notifications' },
    { key: 'notifications_new_application', value: 'true', category: 'notifications' },
    { key: 'notifications_approval', value: 'true', category: 'notifications' },
    { key: 'notifications_payment', value: 'true', category: 'notifications' },
    { key: 'notifications_upcoming_due', value: 'true', category: 'notifications' },
    { key: 'notifications_overdue', value: 'true', category: 'notifications' },
    { key: 'smtp_host', value: '', category: 'notifications' },
    { key: 'smtp_port', value: '587', category: 'notifications' },
    { key: 'smtp_user', value: '', category: 'notifications' },
    { key: 'smtp_password', value: '', category: 'notifications' },
    { key: 'smtp_from_name', value: 'Finanzas Sanas', category: 'notifications' },
    { key: 'smtp_from_email', value: '', category: 'notifications' },

    // DOCUMENTOS
    { 
      key: 'document_contract_template', 
      value: `CONTRATO DE PRÉSTAMO

Entre {company_name} y {customer_name}, identificado con {customer_document}, se celebra el presente contrato:

PRIMERA: MONTO
La empresa registra un acuerdo financiero por {loan_amount} a una tasa de interés anual del {interest_rate}%.

SEGUNDA: PLAZO
El acuerdo será pagado en {installments_count} cuotas {frequency} de {installment_amount} cada una.

TERCERA: GARANTÍAS
El prestatario se compromete al pago puntual según cronograma adjunto.

Firma del Cliente: _________________
Fecha: {date}`, 
      category: 'documents' 
    },
    { 
      key: 'document_receipt_template', 
      value: `COMPROBANTE DE PAGO

Cliente: {customer_name}
Cuenta ID: {loan_id}
Fecha: {payment_date}
Monto Pagado: {payment_amount}
Cuota(s): {installments_paid}
Saldo Restante: {remaining_balance}

Recibido por: {collector_name}`, 
      category: 'documents' 
    },
    { key: 'document_report_header', value: '', category: 'documents' },
    { key: 'document_report_footer', value: 'Generado por Finanzas Sanas', category: 'documents' },

    // SEGURIDAD
    { key: 'security_max_login_attempts', value: '5', category: 'security' },
    { key: 'security_lockout_duration', value: '15', category: 'security' },
    { key: 'security_session_timeout', value: '60', category: 'security' },
    { key: 'security_password_expiry_days', value: '0', category: 'security' },
    { key: 'security_password_min_length', value: '8', category: 'security' },
    { key: 'security_password_require_uppercase', value: 'true', category: 'security' },
    { key: 'security_password_require_numbers', value: 'true', category: 'security' },
    { key: 'security_password_require_special', value: 'false', category: 'security' },

    // BACKUP
    { key: 'backup_auto_enabled', value: 'false', category: 'backup' },
    { key: 'backup_frequency', value: 'weekly', category: 'backup' },
    { key: 'backup_time', value: '02:00', category: 'backup' },
    { key: 'backup_retention', value: '5', category: 'backup' },
  ];

  const brandSettingKeys = new Set([
    'company_name',
    'company_legal_name',
    'smtp_from_name',
    'contract_template',
    'payment_receipt_template',
    'document_report_footer',
  ]);

  for (const setting of defaultSettings) {
    await prisma.settings.upsert({
      where: { key: setting.key },
      update: brandSettingKeys.has(setting.key)
        ? { value: setting.value, category: setting.category }
        : {},
      create: setting,
    });
  }

  console.log(' Settings seeded');
}

async function main() {
  console.log(' Seeding database...');
  
  await seedUsers();
  await seedSettings();
  
  console.log(' Seeding completed!');
}

main()
  .catch((e) => {
    console.error(' Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
