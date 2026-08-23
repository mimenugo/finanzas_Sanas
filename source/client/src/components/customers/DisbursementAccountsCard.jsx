import { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Landmark, Plus, ShieldCheck, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { customerService } from '@/services/customerService';
import { MEXICAN_FINANCIAL_INSTITUTIONS } from '@/constants/mexicanFinancialInstitutions';

const statusStyles = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-800',
  VERIFIED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  REJECTED: 'border-red-200 bg-red-50 text-red-800',
};

const statusLabels = {
  PENDING: 'Pendiente de validacion',
  VERIFIED: 'Verificada',
  REJECTED: 'Rechazada',
};

const hasValidClabeCheckDigit = (value) => {
  const clabe = String(value || '').replace(/\D/g, '');
  if (clabe.length !== 18) return false;

  const factors = [3, 7, 1];
  const sum = clabe.slice(0, 17).split('').reduce(
    (total, digit, index) => total + ((Number(digit) * factors[index % 3]) % 10),
    0,
  );

  return (10 - (sum % 10)) % 10 === Number(clabe[17]);
};

export default function DisbursementAccountsCard({ customerId, canManage, isAdmin }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ bank: '', accountHolder: '', clabe: '', consentAccepted: false });
  const clabeIsComplete = form.clabe.length === 18;
  const clabeIsValid = hasValidClabeCheckDigit(form.clabe);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const result = await customerService.getDisbursementAccounts(customerId);
      setAccounts(result.accounts || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudieron cargar los datos de recepcion');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [customerId]);

  const createAccount = async (event) => {
    event.preventDefault();
    if (!clabeIsValid) {
      toast.error('La CLABE debe tener 18 digitos y un digito verificador valido.');
      return;
    }

    try {
      setSaving(true);
      await customerService.createDisbursementAccount(customerId, form);
      toast.success('Cuenta registrada. Requiere validacion administrativa.');
      setForm({ bank: '', accountHolder: '', clabe: '', consentAccepted: false });
      setShowForm(false);
      await loadAccounts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo registrar la cuenta');
    } finally {
      setSaving(false);
    }
  };

  const verifyAccount = async (accountId, status) => {
    try {
      await customerService.verifyDisbursementAccount(customerId, accountId, {
        status,
        makePrimary: status === 'VERIFIED',
      });
      toast.success(status === 'VERIFIED' ? 'Cuenta verificada y asignada como principal.' : 'Cuenta rechazada.');
      await loadAccounts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo actualizar la cuenta');
    }
  };

  const makePrimary = async (accountId) => {
    try {
      await customerService.setPrimaryDisbursementAccount(customerId, accountId);
      toast.success('Cuenta principal actualizada.');
      await loadAccounts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo asignar la cuenta principal');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" /> Datos para recibir recursos
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">CLABE cifrada; solo se muestran los ultimos cuatro digitos.</p>
        </div>
        {canManage && (
          <Button type="button" size="sm" onClick={() => setShowForm((current) => !current)}>
            <Plus className="mr-2 h-4 w-4" /> Agregar CLABE
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={createAccount} className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm font-medium">
                Banco
                <input required list="mexican-financial-institutions" value={form.bank} onChange={(event) => setForm({ ...form, bank: event.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2" placeholder="Busca o selecciona una institucion" />
                <datalist id="mexican-financial-institutions">
                  {MEXICAN_FINANCIAL_INSTITUTIONS.map((institution) => (
                    <option key={institution.code} value={institution.name} label={`Clave SPEI ${institution.code}`} />
                  ))}
                </datalist>
              </label>
              <label className="text-sm font-medium">
                Titular de la cuenta
                <input required value={form.accountHolder} onChange={(event) => setForm({ ...form, accountHolder: event.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2" placeholder="Nombre como aparece en el banco" />
              </label>
            </div>
            <label className="block max-w-md text-sm font-medium">
              CLABE de 18 digitos
              <input required inputMode="numeric" maxLength={18} value={form.clabe} onChange={(event) => setForm({ ...form, clabe: event.target.value.replace(/\D/g, '').slice(0, 18) })} className={`mt-1 w-full rounded-md border bg-background px-3 py-2 font-mono tracking-wide ${clabeIsComplete && !clabeIsValid ? 'border-red-500 focus-visible:ring-red-500' : ''}`} placeholder="000000000000000000" />
              <span className={`mt-1 block text-xs font-normal ${clabeIsComplete && !clabeIsValid ? 'text-red-600' : 'text-muted-foreground'}`}>
                {clabeIsComplete && !clabeIsValid
                  ? 'La CLABE no pasa la validacion de su digito verificador.'
                  : `18 digitos; se cifrara al guardarla.${form.clabe && !clabeIsComplete ? ` Faltan ${18 - form.clabe.length} digitos.` : ''}`}
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={form.consentAccepted} onChange={(event) => setForm({ ...form, consentAccepted: event.target.checked })} className="mt-0.5" required />
              El cliente confirma que la cuenta es suya y autoriza su uso para recibir recursos.
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving || (clabeIsComplete && !clabeIsValid)}>{saving ? 'Guardando...' : 'Guardar para validacion'}</Button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando cuentas de recepcion...</p>
        ) : accounts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">No hay una cuenta registrada para recibir transferencias.</div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div key={account.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-primary/10 p-2 text-primary"><Building2 className="h-5 w-5" /></div>
                  <div>
                    <p className="font-semibold">{account.bank} {account.isPrimary && <span className="ml-2 text-xs text-primary">Principal</span>}</p>
                    <p className="text-sm text-muted-foreground">{account.accountHolder}</p>
                    <p className="font-mono text-sm">CLABE {account.destinationMasked}</p>
                    {account.verificationNotes && <p className="mt-1 text-xs text-muted-foreground">{account.verificationNotes}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-1 text-xs font-medium ${statusStyles[account.status] || statusStyles.PENDING}`}>{statusLabels[account.status] || account.status}</span>
                  {isAdmin && account.status === 'PENDING' && <Button type="button" size="sm" variant="outline" onClick={() => verifyAccount(account.id, 'REJECTED')}><XCircle className="mr-1 h-4 w-4" /> Rechazar</Button>}
                  {isAdmin && account.status === 'PENDING' && <Button type="button" size="sm" onClick={() => verifyAccount(account.id, 'VERIFIED')}><CheckCircle2 className="mr-1 h-4 w-4" /> Verificar</Button>}
                  {isAdmin && account.status === 'VERIFIED' && !account.isPrimary && <Button type="button" size="sm" variant="outline" onClick={() => makePrimary(account.id)}><ShieldCheck className="mr-1 h-4 w-4" /> Principal</Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
