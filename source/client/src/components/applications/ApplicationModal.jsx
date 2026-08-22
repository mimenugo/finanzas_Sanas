import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { applicationService } from '@/services/applicationService';
import { customerService } from '@/services/customerService';
import { toast } from 'sonner';
import { Save, X, Search } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';


const applicationSchema = z.object({
  customerId: z.number().min(1, 'Selecciona un cliente'),
  requestedAmount: z.string()
    .min(1, 'Ingresa el monto')
    .refine((val) => parseFloat(val) > 0, { message: 'El monto debe ser mayor a 0' }),
  term: z.string()
    .min(1, 'Ingresa el plazo')
    .refine((val) => parseInt(val) > 0, { message: 'El plazo debe ser mayor a 0' }),
  frequency: z.string().min(1, 'Selecciona la frecuencia'),
  purpose: z.string().optional(),
});

export default function ApplicationModal({ open, onClose, onSuccess }) {
  const [customers, setCustomers] = useState([]);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const { rates, availableFrequencies, validateAmount, validateTerm } = useSettings();

  const defaultRate = parseFloat(rates.rate_interest_annual || 20);
  const calculationMethod = rates.rate_calculation_method || 'compound';


  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      customerId: 0,
      requestedAmount: '',
      term: '',
      frequency: 'MONTHLY',
      purpose: ''
    }
  });

  const watchAmount = watch('requestedAmount');
  const watchTerm = watch('term');
  const watchFrequency = watch('frequency');

  useEffect(() => {
    if (open) {
      reset();
      setSelectedCustomer(null);
      setSimulation(null);
    }
  }, [open, reset]);

  
  useEffect(() => {
    if (watchAmount && watchTerm && watchFrequency) {
      calculateInstallments();
    } else {
      setSimulation(null);
    }
  }, [watchAmount, watchTerm, watchFrequency]);

  const calculateInstallments = () => {
    const amount = parseFloat(watchAmount);
    const term = parseInt(watchTerm);

    const amountValidation = validateAmount(amount);
  if (!amountValidation.valid) {
    setSimulation(null);
    return;
  }

  const termValidation = validateTerm(term);
  if (!termValidation.valid) {
    setSimulation(null);
    return;
  }


    if (!amount || !term || amount <= 0 || term <= 0) {
      setSimulation(null);
      return;
    }

    const periodsPerYear = {
      DAILY: 365,
      WEEKLY: 52,
      BIWEEKLY: 26,
      MONTHLY: 12
    };

   const periods = periodsPerYear[watchFrequency];
   const periodRate = defaultRate / 100 / periods; 
   
   let installmentAmount;
   let installments = [];
   let totalInterest;
   
   if (calculationMethod === 'simple') {
    
    totalInterest = amount * (defaultRate / 100) * (term / periods);
    const totalAmount = amount + totalInterest;
    installmentAmount = totalAmount / term;

    const principalPerInstallment = amount / term;
    const interestPerInstallment = totalInterest / term;

    let balance = amount;
    for (let i = 1; i <= term; i++) {
      installments.push({
        number: i,
        principal: principalPerInstallment,
        interest: interestPerInstallment,
        total: installmentAmount,
        balance: balance - principalPerInstallment
      });
      balance -= principalPerInstallment;
    }
  } else {
    installmentAmount = amount *
      (periodRate * Math.pow(1 + periodRate, term)) /
      (Math.pow(1 + periodRate, term) - 1);

    let remainingBalance = amount;
    for (let i = 1; i <= term; i++) {
      const interest = remainingBalance * periodRate;
      const principal = installmentAmount - interest;

      installments.push({
        number: i,
        principal: principal,
        interest: interest,
        total: installmentAmount,
        balance: remainingBalance - principal
      });

      remainingBalance -= principal;
    }

    totalInterest = (installmentAmount * term) - amount;
  }

  const totalPayment = installmentAmount * term;

  setSimulation({
    installmentAmount: parseFloat(installmentAmount.toFixed(2)),
    totalPayment: parseFloat(totalPayment.toFixed(2)),
    totalInterest: parseFloat(totalInterest.toFixed(2)),
    installments,
    term,
    frequency: watchFrequency,
    method: calculationMethod
  });
};

  const searchCustomers = async (query) => {
    if (query.length < 2) {
      setCustomers([]);
      return;
    }

    try {
      const data = await customerService.getAll({ search: query, status: 'ACTIVE', limit: 10 });
      setCustomers(data.customers);
      setShowCustomerList(true);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCustomerSearch = (e) => {
    const value = e.target.value;
    setSearchCustomer(value);
    searchCustomers(value);
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setValue('customerId', customer.id);
    setSearchCustomer(`${customer.firstName} ${customer.lastName} - ${customer.documentNumber}`);
    setShowCustomerList(false);
  };

  const onSubmit = async (data) => {
    try {
      await applicationService.create({
        ...data,
        customerId: parseInt(data.customerId),
        requestedAmount: parseFloat(data.requestedAmount),
        term: parseInt(data.term)
      });
      toast.success('Solicitud creada correctamente');
      onSuccess();
      onClose();
    } catch (error) {
      const message = error.response?.data?.error || 'Error al crear solicitud';
      toast.error(message);
    }
  };

  const getFrequencyLabel = (freq) => {
    const labels = {
      DAILY: 'diaria',
      WEEKLY: 'semanal',
      BIWEEKLY: 'quincenal',
      MONTHLY: 'mensual'
    };
    return labels[freq] || 'por período';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Nueva Solicitud de Cuenta</DialogTitle>
          <DialogDescription>
            Completa los datos de la solicitud de acuerdo financiero
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Cliente */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Cliente</h3>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar Cliente <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchCustomer}
                  onChange={handleCustomerSearch}
                  onFocus={() => searchCustomer.length >= 2 && setShowCustomerList(true)}
                  placeholder="Busca por nombre o documento..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              {errors.customerId && (
                <p className="text-sm text-red-600 mt-1">{errors.customerId.message}</p>
              )}

              {/* Customer dropdown */}
              {showCustomerList && customers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {customers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => handleSelectCustomer(customer)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                    >
                      <p className="font-medium text-gray-900">
                        {customer.firstName} {customer.lastName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {customer.documentNumber} - {customer.phone}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Detalles del acuerdo */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Detalles del Acuerdo</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto Solicitado <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  {...register('requestedAmount')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="1000.00"
                />
                {errors.requestedAmount && (
                  <p className="text-sm text-red-600 mt-1">{errors.requestedAmount.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plazo (cuotas) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  {...register('term')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="12"
                />
                {errors.term && (
                  <p className="text-sm text-red-600 mt-1">{errors.term.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frecuencia <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('frequency')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                 {availableFrequencies.includes ('DAILY') && <option value="DAILY">Diario</option>}
                 {availableFrequencies.includes ('WEEKLY') && <option value="WEEKLY">Semanal</option>}
                 {availableFrequencies.includes ('BIWEEKLY') && <option value="BIWEEKLY">Quincenal</option>}
                 {availableFrequencies.includes ('MONTHLY') && <option value="MONTHLY">Mensual</option>}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo de la Solicitud
              </label>
              <textarea
                {...register('purpose')}
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Describe el motivo..."
              />
            </div>
          </div>

          {/* Simulador de Cuotas - Sistema Francés */}
          {simulation && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Simulación de Cuotas</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Total a pagar</p>
                    <p className="text-xl font-bold text-gray-900">
                      ${simulation.totalPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Interés: ${simulation.totalInterest.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cuota {getFrequencyLabel(simulation.frequency)}</p>
                    <p className="text-xl font-bold text-gray-900">
                      ${simulation.installmentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Cuota fija
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">N° Cuotas</p>
                    <p className="text-xl font-bold text-gray-900">{simulation.term}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                 * Simulación con {simulation.method === 'simple' ? 'Interés Simple' : 'Sistema Francés (cuota fija)'} y tasa del {defaultRate}% anual. La tasa final será definida en la aprobación.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isSubmitting ? 'Guardando...' : 'Crear Solicitud'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
