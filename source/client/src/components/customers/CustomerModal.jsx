import { useEffect, useState } from 'react';
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
import { customerService } from '@/services/customerService';
import { toast } from 'sonner';
import { FileText, Save, Upload, X } from 'lucide-react';
import { buildServerUrl } from '@/config/apiConfig';

const MAX_DOCUMENT_FILE_SIZE = 7 * 1024 * 1024;
const DOCUMENT_TYPES = ['INE', 'CE', 'PASAPORTE', 'RFC'];
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

const requiredText = (message = 'Campo obligatorio') => z.string().trim().min(1, message);

const customerSchema = z.object({
  firstName: requiredText().min(2, 'Minimo 2 caracteres'),
  lastName: requiredText().min(2, 'Minimo 2 caracteres'),
  documentType: requiredText('Seleccione un tipo'),
  customDocumentType: z.string().optional(),
  documentNumber: requiredText().min(5, 'Documento invalido'),
  birthDate: requiredText('Seleccione fecha de nacimiento'),
  gender: requiredText('Seleccione genero'),
  phone: requiredText().min(7, 'Telefono invalido'),
  email: requiredText().email('Email invalido'),
  address: requiredText(),
  company: requiredText(),
  position: requiredText(),
  monthlyIncome: requiredText().refine((value) => Number(value) > 0, 'Debe ser mayor a cero'),
  referenceName: requiredText(),
  referencePhone: requiredText().min(7, 'Telefono invalido'),
  referenceRelation: requiredText(),
  addressProofType: requiredText('Seleccione tipo de comprobante'),
  addressProofIssuedAt: requiredText('Seleccione fecha del comprobante'),
  creditReferenceCustomerId: requiredText('Seleccione una referencia o aval'),
}).refine((data) => data.documentType !== 'OTHER' || data.customDocumentType?.trim(), {
  message: 'Ingrese el tipo de documento',
  path: ['customDocumentType'],
}).refine((data) => {
  const proofDate = new Date(data.addressProofIssuedAt);
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  return !Number.isNaN(proofDate.getTime()) && proofDate >= twoMonthsAgo && proofDate <= new Date();
}, {
  message: 'El comprobante debe ser menor a 2 meses',
  path: ['addressProofIssuedAt'],
});

const fileUrl = buildServerUrl;

export default function CustomerModal({ open, onClose, customer, onSuccess }) {
  const isEdit = !!customer;
  const [photoFile, setPhotoFile] = useState(null);
  const [documentFile, setDocumentFile] = useState(null);
  const [addressProofFile, setAddressProofFile] = useState(null);
  const [creditReferences, setCreditReferences] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: customer || {},
  });

  const documentType = watch('documentType');

  useEffect(() => {
    if (!open) return;

    let ignore = false;

    const loadCreditReferences = async () => {
      try {
        const data = await customerService.getCreditReferences({
          excludeId: customer?.id,
          limit: 50,
        });
        const references = data.customers || [];
        const currentReference = customer?.creditReferenceCustomer;

        if (
          currentReference &&
          !references.some((reference) => reference.id === currentReference.id)
        ) {
          references.unshift(currentReference);
        }

        if (!ignore) {
          setCreditReferences(references);
        }
      } catch (error) {
        if (!ignore) {
          setCreditReferences([]);
          toast.error('No se pudieron cargar los avales disponibles');
        }
      }
    };

    loadCreditReferences();

    return () => {
      ignore = true;
    };
  }, [open, customer]);

  useEffect(() => {
    if (customer) {
      const isKnownDocumentType = DOCUMENT_TYPES.includes(customer.documentType);
      reset({
        ...customer,
        documentType: isKnownDocumentType ? customer.documentType : 'OTHER',
        customDocumentType: isKnownDocumentType ? '' : customer.documentType,
        birthDate: customer.birthDate ? customer.birthDate.split('T')[0] : '',
        monthlyIncome: customer.monthlyIncome ? customer.monthlyIncome.toString() : '',
        addressProofIssuedAt: customer.addressProofIssuedAt
          ? customer.addressProofIssuedAt.split('T')[0]
          : '',
        creditReferenceCustomerId: customer.creditReferenceCustomerId
          ? String(customer.creditReferenceCustomerId)
          : '',
      });
    } else {
      reset({
        firstName: '',
        lastName: '',
        documentType: 'INE',
        customDocumentType: '',
        documentNumber: '',
        birthDate: '',
        gender: 'M',
        phone: '',
        email: '',
        address: '',
        company: '',
        position: '',
        monthlyIncome: '',
        referenceName: '',
        referencePhone: '',
        referenceRelation: '',
        addressProofType: 'Agua',
        addressProofIssuedAt: '',
        creditReferenceCustomerId: '',
      });
    }

    setPhotoFile(null);
    setDocumentFile(null);
    setAddressProofFile(null);
  }, [customer, reset, open]);

  const validateFile = (file) => {
    if (file.size > MAX_DOCUMENT_FILE_SIZE) {
      return 'El archivo supera el limite de 7 MB.';
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return 'Solo se permiten archivos PDF o imagenes JPG, PNG o WEBP.';
    }

    return null;
  };

  const handleFileChange = (event, setter) => {
    const file = event.target.files?.[0];

    if (!file) {
      setter(null);
      return;
    }

    const error = validateFile(file);

    if (error) {
      event.target.value = '';
      setter(null);
      toast.warning(error);
      return;
    }

    setter(file);
  };

  const onSubmit = async (data) => {
    try {
      if (!documentFile && !customer?.documentFileUrl) {
        toast.error('El Documento de INE es obligatorio');
        return;
      }

      if (!addressProofFile && !customer?.addressProofFileUrl) {
        toast.error('El comprobante de domicilio es obligatorio');
        return;
      }

      const payload = {
        ...data,
        documentType: data.documentType === 'OTHER' ? data.customDocumentType.trim() : data.documentType,
        creditReferenceCustomerId: data.creditReferenceCustomerId,
      };

      delete payload.customDocumentType;

      if (documentFile) {
        payload.documentFile = documentFile;
      }

    if (addressProofFile) {
      payload.addressProofFile = addressProofFile;
    }

    if (photoFile) {
      payload.photoFile = photoFile;
    }

      if (isEdit) {
        await customerService.update(customer.id, payload);
        toast.success('Cliente actualizado correctamente');
      } else {
        await customerService.create(payload);
        toast.success('Cliente creado correctamente');
      }

      onSuccess();
      onClose();
    } catch (error) {
      const message = error.response?.data?.error || 'Error al guardar cliente';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
          </DialogTitle>
          <DialogDescription>
            Todos los campos son obligatorios para registrar o actualizar el cliente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Datos Personales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Fotografia del cliente</label>
                <label className="flex min-h-[42px] cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors hover:border-primary hover:bg-gray-50">
                  <span className="flex min-w-0 items-center gap-2">
                    <Upload className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{photoFile ? photoFile.name : 'Tomar o cargar fotografia'}</span>
                  </span>
                  <span className="flex-shrink-0 text-xs text-gray-500">Imagen max 7 MB</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/webp"
                    capture="user"
                    className="hidden"
                    onChange={(event) => handleFileChange(event, setPhotoFile)}
                  />
                </label>
                {customer?.photo && !photoFile && (
                  <a href={fileUrl(customer.photo)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm text-primary hover:underline">
                    <FileText className="h-4 w-4" />
                    Ver fotografia actual
                  </a>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input {...register('firstName')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                {errors.firstName && <p className="text-sm text-red-600 mt-1">{errors.firstName.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
                <input {...register('lastName')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                {errors.lastName && <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Documento *</label>
                <select {...register('documentType')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                  <option value="INE">INE</option>
                  <option value="CE">Credencial Extranjero</option>
                  <option value="PASAPORTE">Pasaporte</option>
                  <option value="RFC">RFC</option>
                  <option value="OTHER">Otro</option>
                </select>
                {errors.documentType && <p className="text-sm text-red-600 mt-1">{errors.documentType.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numero Documento *</label>
                <input {...register('documentNumber')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                {errors.documentNumber && <p className="text-sm text-red-600 mt-1">{errors.documentNumber.message}</p>}
              </div>

              {documentType === 'OTHER' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo tipo de documento *</label>
                  <input {...register('customDocumentType')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                  {errors.customDocumentType && <p className="text-sm text-red-600 mt-1">{errors.customDocumentType.message}</p>}
                </div>
              )}

              <div className={documentType === 'OTHER' ? '' : 'md:col-span-2'}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Documento de INE *</label>
                <label className="flex min-h-[42px] cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors hover:border-primary hover:bg-gray-50">
                  <span className="flex min-w-0 items-center gap-2">
                    <Upload className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{documentFile ? documentFile.name : 'Subir PDF o imagen'}</span>
                  </span>
                  <span className="flex-shrink-0 text-xs text-gray-500">Max 7 MB</span>
                  <input type="file" accept="application/pdf,image/jpeg,image/png,image/jpg,image/webp" className="hidden" onChange={(event) => handleFileChange(event, setDocumentFile)} />
                </label>
                {customer?.documentFileUrl && !documentFile && (
                  <a href={fileUrl(customer.documentFileUrl)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm text-primary hover:underline">
                    <FileText className="h-4 w-4" />
                    Ver INE actual
                  </a>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Nacimiento *</label>
                <input type="date" {...register('birthDate')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                {errors.birthDate && <p className="text-sm text-red-600 mt-1">{errors.birthDate.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Genero *</label>
                <select {...register('gender')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="O">Otro</option>
                </select>
                {errors.gender && <p className="text-sm text-red-600 mt-1">{errors.gender.message}</p>}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Contacto y Domicilio</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefono *</label>
                <input {...register('phone')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" {...register('email')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Direccion *</label>
                <input {...register('address')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                {errors.address && <p className="text-sm text-red-600 mt-1">{errors.address.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comprobante de domicilio *</label>
                <select {...register('addressProofType')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                  <option value="Agua">Agua</option>
                  <option value="Luz">Luz</option>
                </select>
                {errors.addressProofType && <p className="text-sm text-red-600 mt-1">{errors.addressProofType.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del comprobante *</label>
                <input type="date" {...register('addressProofIssuedAt')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                {errors.addressProofIssuedAt && <p className="text-sm text-red-600 mt-1">{errors.addressProofIssuedAt.message}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Archivo del comprobante *</label>
                <label className="flex min-h-[42px] cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors hover:border-primary hover:bg-gray-50">
                  <span className="flex min-w-0 items-center gap-2">
                    <Upload className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{addressProofFile ? addressProofFile.name : 'Subir PDF o imagen'}</span>
                  </span>
                  <span className="flex-shrink-0 text-xs text-gray-500">Max 7 MB</span>
                  <input type="file" accept="application/pdf,image/jpeg,image/png,image/jpg,image/webp" className="hidden" onChange={(event) => handleFileChange(event, setAddressProofFile)} />
                </label>
                {customer?.addressProofFileUrl && !addressProofFile && (
                  <a href={fileUrl(customer.addressProofFileUrl)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm text-primary hover:underline">
                    <FileText className="h-4 w-4" />
                    Ver comprobante actual
                  </a>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Datos Laborales</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empresa *</label>
                <input {...register('company')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                {errors.company && <p className="text-sm text-red-600 mt-1">{errors.company.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cargo *</label>
                <input {...register('position')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                {errors.position && <p className="text-sm text-red-600 mt-1">{errors.position.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ingresos Mensuales ($) *</label>
                <input type="number" step="0.01" {...register('monthlyIncome')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                {errors.monthlyIncome && <p className="text-sm text-red-600 mt-1">{errors.monthlyIncome.message}</p>}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Referencias</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre referencia personal *</label>
                <input {...register('referenceName')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                {errors.referenceName && <p className="text-sm text-red-600 mt-1">{errors.referenceName.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefono referencia *</label>
                <input {...register('referencePhone')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                {errors.referencePhone && <p className="text-sm text-red-600 mt-1">{errors.referencePhone.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parentesco *</label>
                <input {...register('referenceRelation')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
                {errors.referenceRelation && <p className="text-sm text-red-600 mt-1">{errors.referenceRelation.message}</p>}
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Referencia financiera o aval *</label>
                <select {...register('creditReferenceCustomerId')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                  <option value="">Seleccione un cliente con buen historial</option>
                  {creditReferences.map((reference) => (
                    <option key={reference.id} value={reference.id}>
                      {reference.firstName} {reference.lastName} - {reference.documentNumber}
                    </option>
                  ))}
                </select>
                {errors.creditReferenceCustomerId && <p className="text-sm text-red-600 mt-1">{errors.creditReferenceCustomerId.message}</p>}
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isSubmitting ? 'Guardando...' : 'Guardar Cliente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
