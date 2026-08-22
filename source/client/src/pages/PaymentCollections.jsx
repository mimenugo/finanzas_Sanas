import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { paymentCollectionsService } from '@/services/paymentCollectionsService';
import { toast } from 'sonner';
import { Building2, CreditCard, Landmark, RefreshCw, Save, Settings, Wallet } from 'lucide-react';
import { buildApiUrl, buildClientUrl } from '@/config/apiConfig';

const settingKeys = [
  ['currency', 'Moneda'],
  ['timezone', 'Zona horaria'],
  ['country', 'Pais'],
  ['reference_prefix', 'Prefijo referencia'],
  ['reference_length', 'Longitud referencia'],
  ['reference_expiration_hours', 'Expiracion de referencias (horas)'],
  ['max_confirmation_hours', 'Tiempo maximo de confirmacion (horas)'],
  ['max_attempts', 'Intentos maximos'],
  ['fee_paid_by', 'Comision absorbida por'],
  ['notifications_enabled', 'Notificaciones automaticas'],
];

const providerTemplates = {
  SPEI: {
    credentials: {
      apiBaseUrl: 'https://sandbox.proveedor-spei.com',
      apiKey: '',
      merchantId: '',
      privateKeyPem: '',
      certificatePem: '',
      certificateSerial: '',
      webhookSecret: '',
    },
    webhookUrls: {
      confirmationUrl: buildApiUrl('payment-collections/webhooks/SPEI'),
      returnUrl: buildClientUrl('mis-pagos'),
      errorUrl: buildClientUrl('mis-pagos'),
    },
    settings: {
      receivingBank: '',
      receivingAccountId: '',
      clabe: '',
      alias: '',
      reconciliationMinutes: 10,
      autoValidation: false,
      ipWhitelist: '',
    },
  },
  STRIPE: {
    credentials: { publicKey: '', secretKey: '', webhookSecret: '' },
    webhookUrls: { confirmationUrl: buildApiUrl('payment-collections/webhooks/STRIPE') },
    settings: { captureMode: 'automatic' },
  },
  OPENPAY: {
    credentials: { merchantId: '', publicKey: '', privateKey: '' },
    webhookUrls: { confirmationUrl: buildApiUrl('payment-collections/webhooks/OPENPAY') },
    settings: { use3ds: true },
  },
  CONEKTA: {
    credentials: { publicKey: '', privateKey: '', webhookSecret: '' },
    webhookUrls: { confirmationUrl: buildApiUrl('payment-collections/webhooks/CONEKTA') },
    settings: { oxxoCashEnabled: true },
  },
  OXXO: {
    credentials: { provider: 'CONEKTA', apiKey: '' },
    webhookUrls: { confirmationUrl: buildApiUrl('payment-collections/webhooks/OXXO') },
    settings: { expirationHours: 72, barcodeEnabled: true },
  },
  BANK_REFERENCE: {
    credentials: {},
    webhookUrls: {},
    settings: { prefix: 'CRD', length: 12, expirationHours: 72 },
  },
};

const stringifyJson = (value, fallback = {}) => {
  const source = value && Object.keys(value).length ? value : fallback;
  return JSON.stringify(source, null, 2);
};

const parseJsonField = (value, label) => {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    throw new Error(`${label} no tiene un JSON valido`);
  }
};

const readJsonValue = (jsonValue, key) => {
  try {
    return (jsonValue ? JSON.parse(jsonValue) : {})[key] || '';
  } catch {
    return '';
  }
};

function StatCard({ title, value }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-gray-500">{title}</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function PaymentCollections() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [config, setConfig] = useState({ settings: [], methods: [], accounts: [], providers: [] });
  const [settingsForm, setSettingsForm] = useState({});
  const [providerForms, setProviderForms] = useState({});
  const [accountForm, setAccountForm] = useState({
    bank: '',
    name: '',
    accountHolder: '',
    accountNumber: '',
    clabe: '',
    cardNumber: '',
    branch: '',
    currency: 'MXN',
    accountType: 'CHECKING',
    color: '#2563eb',
    active: true,
    isPrimary: false,
    useSpei: true,
    useDeposits: true,
    useReferences: true,
    useTransfers: true,
  });

  const settingsMap = useMemo(() => {
    return config.settings.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});
  }, [config.settings]);

  const stripeProvider = useMemo(() => {
    return config.providers.find((provider) => provider.code === 'STRIPE');
  }, [config.providers]);

  const load = async () => {
    try {
      setLoading(true);
      const [dash, cfg] = await Promise.all([
        paymentCollectionsService.dashboard(),
        paymentCollectionsService.config(),
      ]);
      setDashboard(dash);
      setConfig(cfg);
      setSettingsForm(cfg.settings.reduce((acc, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {}));
    } catch (error) {
      toast.error('No se pudo cargar Pagos y Cobranza');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const nextForms = {};
    config.providers.forEach((provider) => {
      const template = providerTemplates[provider.code] || {};
      nextForms[provider.code] = {
        name: provider.name || provider.code,
        mode: provider.mode || 'SANDBOX',
        active: Boolean(provider.active),
        credentials: stringifyJson(provider.credentials, template.credentials || {}),
        webhookUrls: stringifyJson(provider.webhookUrls, template.webhookUrls || {}),
        settings: stringifyJson(provider.settings, template.settings || {}),
      };
    });
    setProviderForms(nextForms);
  }, [config.providers]);

  const saveSettings = async () => {
    try {
      await paymentCollectionsService.saveSettings(settingsForm);
      toast.success('Configuracion guardada');
      load();
    } catch {
      toast.error('No se pudo guardar configuracion');
    }
  };

  const toggleMethod = async (method) => {
    try {
      await paymentCollectionsService.saveMethod({ ...method, active: !method.active });
      toast.success('Metodo actualizado');
      load();
    } catch {
      toast.error('No se pudo actualizar metodo');
    }
  };

  const toggleProvider = async (provider) => {
    try {
      await paymentCollectionsService.saveProvider({ ...provider, active: !provider.active });
      toast.success('Pasarela actualizada');
      load();
    } catch {
      toast.error('No se pudo actualizar pasarela');
    }
  };

  const updateProviderForm = (code, key, value) => {
    setProviderForms((current) => ({
      ...current,
      [code]: {
        ...(current[code] || {}),
        [key]: value,
      },
    }));
  };

  const updateProviderJsonValue = (code, section, key, value) => {
    setProviderForms((current) => {
      const form = current[code] || {};
      let parsed = {};
      try {
        parsed = form[section] ? JSON.parse(form[section]) : {};
      } catch {
        parsed = {};
      }

      return {
        ...current,
        [code]: {
          ...form,
          [section]: JSON.stringify({ ...parsed, [key]: value }, null, 2),
        },
      };
    });
  };

  const saveProviderConfig = async (provider) => {
    try {
      const form = providerForms[provider.code] || {};
      await paymentCollectionsService.saveProvider({
        code: provider.code,
        name: form.name || provider.name || provider.code,
        mode: form.mode || 'SANDBOX',
        active: Boolean(form.active),
        credentials: parseJsonField(form.credentials, 'Credenciales'),
        webhookUrls: parseJsonField(form.webhookUrls, 'Webhooks'),
        settings: parseJsonField(form.settings, 'Parametros'),
      });
      toast.success('Configuracion de pasarela guardada');
      load();
    } catch (error) {
      toast.error(error.message || 'No se pudo guardar la pasarela');
    }
  };

  const saveAccount = async () => {
    try {
      await paymentCollectionsService.saveBankAccount(accountForm);
      toast.success('Cuenta bancaria guardada');
      setAccountForm({ ...accountForm, bank: '', name: '', accountHolder: '', accountNumber: '', clabe: '', cardNumber: '', branch: '' });
      load();
    } catch {
      toast.error('No se pudo guardar cuenta bancaria');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pagos y Cobranza</h1>
          <p className="text-gray-600 mt-1">Administracion de metodos, cuentas, referencias y pasarelas.</p>
        </div>
        <Button onClick={load} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="settings">Configuracion</TabsTrigger>
          <TabsTrigger value="methods">Metodos</TabsTrigger>
          <TabsTrigger value="accounts">Cuentas</TabsTrigger>
          <TabsTrigger value="providers">Pasarelas</TabsTrigger>
          <TabsTrigger value="spei">SPEI / Referencias</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard title="Cobrado hoy" value={`$${Number(dashboard?.totals?.today || 0).toFixed(2)}`} />
            <StatCard title="Cobrado del mes" value={`$${Number(dashboard?.totals?.month || 0).toFixed(2)}`} />
            <StatCard title="Pagos pendientes" value={dashboard?.totals?.pending || 0} />
            <StatCard title="Pagos vencidos" value={dashboard?.totals?.overduePayments || 0} />
            <StatCard title="Confirmados" value={dashboard?.totals?.confirmed || 0} />
            <StatCard title="Rechazados" value={dashboard?.totals?.rejected || 0} />
            <StatCard title="En proceso" value={dashboard?.totals?.processing || 0} />
            <StatCard title="Cancelados/devueltos" value={`${dashboard?.totals?.canceled || 0}/${dashboard?.totals?.refunded || 0}`} />
          </div>
          <Card className="mt-4">
            <CardHeader><CardTitle>Ultimos movimientos</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left"><th className="py-2">Folio</th><th>Monto</th><th>Metodo</th><th>Proveedor</th><th>Estado</th></tr></thead>
                  <tbody>
                    {(dashboard?.latestTransactions || []).map((tx) => (
                      <tr key={tx.id} className="border-b">
                        <td className="py-2">{tx.folio}</td>
                        <td>${Number(tx.amount).toFixed(2)}</td>
                        <td>{tx.method?.name || '-'}</td>
                        <td>{tx.provider?.name || '-'}</td>
                        <td>{tx.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Configuracion General</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {settingKeys.map(([key, label]) => (
                <label key={key} className="text-sm font-medium text-gray-700">
                  {label}
                  <input
                    value={settingsForm[key] ?? settingsMap[key] ?? ''}
                    onChange={(event) => setSettingsForm({ ...settingsForm, [key]: event.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                  />
                </label>
              ))}
              <div className="md:col-span-2 flex justify-end">
                <Button onClick={saveSettings}><Save className="mr-2 h-4 w-4" />Guardar</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods">
          <Card className="mb-4">
            <CardContent className="p-4 text-sm text-gray-700">
              Activa aqui los metodos que debe ver el cliente en Mis Pagos. Para Stripe, activa Tarjeta Debito, Tarjeta Credito o Stripe; para ocultar Openpay o Conekta, dejalos como inactivos.
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.methods.map((method) => (
              <Card key={method.id}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{method.name}</p>
                    <p className="text-sm text-gray-500">{method.description}</p>
                    <p className="text-xs text-gray-400">Proveedor: {method.providerCode || 'Interno'} | Comision: {method.feeValue}</p>
                    {method.providerCode === 'STRIPE' && (
                      <p className="mt-1 text-xs text-blue-600">Se mostrara al cliente cuando este activo y Stripe tenga credenciales configuradas.</p>
                    )}
                  </div>
                  <Button variant={method.active ? 'default' : 'outline'} onClick={() => toggleMethod(method)}>
                    {method.active ? 'Visible al cliente' : 'Oculto'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="accounts">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5" /> Nueva cuenta bancaria</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                ['bank', 'Banco'],
                ['name', 'Nombre de la cuenta'],
                ['accountHolder', 'Titular'],
                ['accountNumber', 'Numero de cuenta'],
                ['clabe', 'CLABE'],
                ['cardNumber', 'Numero de tarjeta'],
                ['branch', 'Sucursal'],
                ['currency', 'Moneda'],
                ['accountType', 'Tipo de cuenta'],
                ['color', 'Color identificador'],
              ].map(([key, label]) => (
                <label key={key} className="text-sm font-medium text-gray-700">
                  {label}
                  <input value={accountForm[key]} onChange={(event) => setAccountForm({ ...accountForm, [key]: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
              ))}
              <div className="md:col-span-3 flex flex-wrap gap-3">
                {['isPrimary', 'active', 'useSpei', 'useDeposits', 'useReferences', 'useTransfers'].map((key) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={Boolean(accountForm[key])} onChange={(event) => setAccountForm({ ...accountForm, [key]: event.target.checked })} />
                    {key}
                  </label>
                ))}
              </div>
              <div className="md:col-span-3 flex justify-end">
                <Button onClick={saveAccount}><Save className="mr-2 h-4 w-4" />Guardar cuenta</Button>
              </div>
            </CardContent>
          </Card>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.accounts.map((account) => (
              <Card key={account.id}>
                <CardContent className="p-4">
                  <p className="font-semibold">{account.bank} - {account.name}</p>
                  <p className="text-sm text-gray-500">{account.accountHolder}</p>
                  <p className="text-xs text-gray-400">CLABE: {account.clabe || '-'} | {account.active ? 'Activa' : 'Inactiva'}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="providers">
          {stripeProvider && (
            <Card className="mb-4 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Configuracion principal Stripe</span>
                  <Button size="sm" variant={providerForms.STRIPE?.active ? 'default' : 'outline'} onClick={() => toggleProvider(stripeProvider)}>
                    {providerForms.STRIPE?.active ? 'Pasarela activa' : 'Pasarela inactiva'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="text-sm font-medium text-gray-700">
                    Modo
                    <select
                      value={providerForms.STRIPE?.mode || 'SANDBOX'}
                      onChange={(event) => updateProviderForm('STRIPE', 'mode', event.target.value)}
                      className="mt-1 w-full rounded-lg border px-3 py-2"
                    >
                      <option value="SANDBOX">Sandbox / Pruebas</option>
                      <option value="PRODUCTION">Produccion</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    URL webhook del sistema
                    <input
                      value={buildApiUrl('payment-collections/webhooks/STRIPE')}
                      readOnly
                      className="mt-1 w-full rounded-lg border bg-gray-50 px-3 py-2 text-xs"
                    />
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    Public Key
                    <input
                      value={readJsonValue(providerForms.STRIPE?.credentials, 'publicKey')}
                      onChange={(event) => updateProviderJsonValue('STRIPE', 'credentials', 'publicKey', event.target.value)}
                      placeholder="pk_test_..."
                      className="mt-1 w-full rounded-lg border px-3 py-2"
                    />
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    Secret Key
                    <input
                      type="password"
                      value={readJsonValue(providerForms.STRIPE?.credentials, 'secretKey')}
                      onChange={(event) => updateProviderJsonValue('STRIPE', 'credentials', 'secretKey', event.target.value)}
                      placeholder="sk_test_..."
                      className="mt-1 w-full rounded-lg border px-3 py-2"
                    />
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    Webhook Secret
                    <input
                      type="password"
                      value={readJsonValue(providerForms.STRIPE?.credentials, 'webhookSecret')}
                      onChange={(event) => updateProviderJsonValue('STRIPE', 'credentials', 'webhookSecret', event.target.value)}
                      placeholder="whsec_..."
                      className="mt-1 w-full rounded-lg border px-3 py-2"
                    />
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    Confirmacion webhook
                    <input
                      value={readJsonValue(providerForms.STRIPE?.webhookUrls, 'confirmationUrl')}
                      onChange={(event) => updateProviderJsonValue('STRIPE', 'webhookUrls', 'confirmationUrl', event.target.value)}
                      className="mt-1 w-full rounded-lg border px-3 py-2"
                    />
                  </label>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                  Para mostrar Stripe al cliente activa tambien los metodos Tarjeta Debito, Tarjeta Credito o Stripe en la pestana Metodos. El pago real requiere el adaptador de Checkout y webhook de Stripe.
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => saveProviderConfig(stripeProvider)}>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Stripe
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.providers.map((provider) => (
              <Card key={provider.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3 text-base">
                    <span>{provider.name}</span>
                    <Button size="sm" variant={providerForms[provider.code]?.active ? 'default' : 'outline'} onClick={() => toggleProvider(provider)}>
                      {providerForms[provider.code]?.active ? 'Activa' : 'Inactiva'}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="text-sm font-medium text-gray-700">
                      Nombre
                      <input
                        value={providerForms[provider.code]?.name || ''}
                        onChange={(event) => updateProviderForm(provider.code, 'name', event.target.value)}
                        className="mt-1 w-full rounded-lg border px-3 py-2"
                      />
                    </label>
                    <label className="text-sm font-medium text-gray-700">
                      Modo
                      <select
                        value={providerForms[provider.code]?.mode || 'SANDBOX'}
                        onChange={(event) => updateProviderForm(provider.code, 'mode', event.target.value)}
                        className="mt-1 w-full rounded-lg border px-3 py-2"
                      >
                        <option value="SANDBOX">Sandbox</option>
                        <option value="PRODUCTION">Produccion</option>
                      </select>
                    </label>
                  </div>
                  <label className="block text-sm font-medium text-gray-700">
                    Credenciales y certificados (JSON)
                    <textarea
                      value={providerForms[provider.code]?.credentials || '{}'}
                      onChange={(event) => updateProviderForm(provider.code, 'credentials', event.target.value)}
                      rows={provider.code === 'SPEI' ? 9 : 5}
                      className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-xs"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    URLs de webhooks y retorno (JSON)
                    <textarea
                      value={providerForms[provider.code]?.webhookUrls || '{}'}
                      onChange={(event) => updateProviderForm(provider.code, 'webhookUrls', event.target.value)}
                      rows={4}
                      className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-xs"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Parametros operativos (JSON)
                    <textarea
                      value={providerForms[provider.code]?.settings || '{}'}
                      onChange={(event) => updateProviderForm(provider.code, 'settings', event.target.value)}
                      rows={5}
                      className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-xs"
                    />
                  </label>
                  <div className="flex justify-end">
                    <Button onClick={() => saveProviderConfig(provider)}>
                      <Save className="mr-2 h-4 w-4" />
                      Guardar pasarela
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="spei">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> SPEI</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>El sistema ya almacena cuenta receptora, CLABE, proveedor, webhook y transacciones para conciliacion.</p>
                <p>Para operar SPEI real se debe conectar la API del banco/STP y capturar aqui URL base, llaves, certificados, webhook y parametros de conciliacion.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Referencias / OXXO</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>La API puede generar referencias por cuenta y registrar folios para auditoria.</p>
                <p>Los adaptadores actuales quedan preparados para Conekta, Openpay, Stripe, OXXO, SPEI y referencias bancarias.</p>
              </CardContent>
            </Card>
            {config.providers.filter((provider) => provider.code === 'SPEI').map((provider) => (
              <Card key={provider.id} className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3">
                    <span>Configuracion tecnica SPEI</span>
                    <Button size="sm" variant={providerForms.SPEI?.active ? 'default' : 'outline'} onClick={() => toggleProvider(provider)}>
                      {providerForms.SPEI?.active ? 'Activa' : 'Inactiva'}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className="text-sm font-medium text-gray-700">
                      Proveedor
                      <input
                        value={providerForms.SPEI?.name || 'SPEI'}
                        onChange={(event) => updateProviderForm('SPEI', 'name', event.target.value)}
                        className="mt-1 w-full rounded-lg border px-3 py-2"
                      />
                    </label>
                    <label className="text-sm font-medium text-gray-700">
                      Modo
                      <select
                        value={providerForms.SPEI?.mode || 'SANDBOX'}
                        onChange={(event) => updateProviderForm('SPEI', 'mode', event.target.value)}
                        className="mt-1 w-full rounded-lg border px-3 py-2"
                      >
                        <option value="SANDBOX">Sandbox</option>
                        <option value="PRODUCTION">Produccion</option>
                      </select>
                    </label>
                    <label className="text-sm font-medium text-gray-700">
                      Webhook de confirmacion
                      <input
                        value={buildApiUrl('payment-collections/webhooks/SPEI')}
                        readOnly
                        className="mt-1 w-full rounded-lg border bg-gray-50 px-3 py-2 text-xs"
                      />
                    </label>
                  </div>

                  <label className="block text-sm font-medium text-gray-700">
                    Credenciales, llaves y certificados SPEI (JSON)
                    <textarea
                      value={providerForms.SPEI?.credentials || '{}'}
                      onChange={(event) => updateProviderForm('SPEI', 'credentials', event.target.value)}
                      rows={10}
                      className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-xs"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Webhooks y URLs de respuesta SPEI (JSON)
                    <textarea
                      value={providerForms.SPEI?.webhookUrls || '{}'}
                      onChange={(event) => updateProviderForm('SPEI', 'webhookUrls', event.target.value)}
                      rows={5}
                      className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-xs"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Parametros de conciliacion SPEI (JSON)
                    <textarea
                      value={providerForms.SPEI?.settings || '{}'}
                      onChange={(event) => updateProviderForm('SPEI', 'settings', event.target.value)}
                      rows={7}
                      className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-xs"
                    />
                  </label>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Las llaves y certificados se obtienen con el banco o agregador SPEI/STP al contratar el servicio. En produccion tambien suelen pedir IP publica, contrato, cuenta concentradora, ambiente sandbox, certificados y formato oficial de webhooks.
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => saveProviderConfig(provider)}>
                      <Save className="mr-2 h-4 w-4" />
                      Guardar SPEI
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
