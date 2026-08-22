import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { publicRegistrationService } from '@/services/publicRegistrationService';
import { Button } from '@/components/ui/button';
import { Camera, CheckCircle, ChevronLeft, ChevronRight, Send, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { PORTAL_NAME, PUBLIC_DESCRIPTION } from '@/constants/branding';

const initialForm = {
  firstName: '',
  lastName: '',
  birthDate: '',
  documentType: 'INE',
  documentNumber: '',
  phone: '',
  email: '',
  address: '',
  company: '',
  position: '',
  monthlyIncome: '',
  referenceName: '',
  referencePhone: '',
  referenceRelation: '',
};

const steps = [
  'Bienvenida',
  'Fotografia',
  'Prueba de vida',
  'Datos personales',
  'Resumen',
  'Enviar',
];

function dataUrlToFile(dataUrl, fileName) {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bytes = atob(base64);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) {
    buffer[i] = bytes.charCodeAt(i);
  }
  return new File([buffer], fileName, { type: mime });
}

function CameraCapture({ label, value, onCapture, allowUpload = true }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [active, setActive] = useState(false);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setActive(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setActive(true);
    } catch (error) {
      toast.error('No se pudo acceder a la camara. Verifica permisos del navegador.');
    }
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapture(canvas.toDataURL('image/jpeg', 0.92));
    stopCamera();
  };

  useEffect(() => () => stopCamera(), []);

  return (
    <div className="space-y-3">
      <div className="aspect-video overflow-hidden rounded-lg bg-gray-100 border">
        {value ? (
          <img src={value} alt={label} className="h-full w-full object-cover" />
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <div className="flex flex-wrap gap-2">
        {!active ? (
          <Button type="button" onClick={startCamera}>
            <Camera className="mr-2 h-4 w-4" />
            Usar camara
          </Button>
        ) : (
          <Button type="button" onClick={capture}>
            <Camera className="mr-2 h-4 w-4" />
            Capturar
          </Button>
        )}
        {allowUpload && (
          <label className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
            <Upload className="mr-2 h-4 w-4" />
            Cargar imagen
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (file.size > 7 * 1024 * 1024) {
                  toast.warning('La imagen supera el limite de 7 MB.');
                  event.target.value = '';
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => onCapture(reader.result);
                reader.readAsDataURL(file);
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}

export default function PublicRegistration() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [photo, setPhoto] = useState(null);
  const [livenessPhoto, setLivenessPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await publicRegistrationService.get(token);
        setCompleted(Boolean(data.completed));
        if (data.progress) {
          setForm({ ...initialForm, ...data.progress });
        }
      } catch (error) {
        toast.error(error.response?.data?.error || 'El enlace no esta disponible');
        setCompleted(true);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token]);

  const saveProgress = async (nextForm = form) => {
    try {
      await publicRegistrationService.saveProgress(token, nextForm);
    } catch {
      // Non-blocking: the final submit still validates everything.
    }
  };

  const updateField = (field, value) => {
    const next = { ...form, [field]: value };
    setForm(next);
    saveProgress(next);
  };

  const canContinue = () => {
    if (step === 1 && !photo) return false;
    if (step === 2 && !livenessPhoto) return false;
    if (step === 3) {
      return Object.entries(form).every(([, value]) => `${value}`.trim() !== '');
    }
    return true;
  };

  const submit = async () => {
    if (!photo || !livenessPhoto) {
      toast.error('Captura fotografia y prueba de vida antes de enviar.');
      return;
    }

    try {
      setSubmitting(true);
      await publicRegistrationService.submit(token, {
        ...form,
        photo: dataUrlToFile(photo, 'foto-cliente.jpg'),
        livenessPhoto: dataUrlToFile(livenessPhoto, 'prueba-vida.jpg'),
      });
      setCompleted(true);
      setStep(5);
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo enviar el registro');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-gray-50">Cargando registro...</div>;
  }

  if (completed) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50 p-4">
        <div className="max-w-md rounded-lg bg-white p-6 text-center shadow">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-900">Registro enviado</h1>
          <p className="mt-2 text-gray-600">
            Tu informacion fue recibida. Un administrador revisara la validacion y finalizara el alta de tu cuenta.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto max-w-2xl rounded-lg bg-white shadow">
        <div className="border-b p-5">
          <p className="mb-2 text-sm font-semibold text-primary">{PORTAL_NAME}</p>
          <p className="text-sm text-gray-500">Paso {step + 1} de {steps.length}</p>
          <h1 className="text-2xl font-bold text-gray-900">{steps[step]}</h1>
          {step === 0 && <p className="mt-2 text-sm text-gray-500">{PUBLIC_DESCRIPTION}</p>}
          <div className="mt-4 h-2 rounded-full bg-gray-100">
            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
        </div>

        <div className="p-5">
          {step === 0 && (
            <div className="space-y-3">
              <p className="text-gray-700">
                Completaras tu alta en pocos pasos. Necesitaremos una fotografia, una prueba de vida y tus datos personales.
              </p>
              <p className="text-sm text-gray-500">
                Usa buena iluminacion y permite el acceso a la camara cuando el navegador lo solicite.
              </p>
            </div>
          )}

          {step === 1 && (
            <CameraCapture label="Fotografia del cliente" value={photo} onCapture={setPhoto} />
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
                Mira a la camara y gira ligeramente el rostro antes de capturar. Esta evidencia sera revisada para evitar uso de fotografias impresas o pantallas.
              </div>
              <CameraCapture label="Prueba de vida" value={livenessPhoto} onCapture={setLivenessPhoto} allowUpload={false} />
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 gap-4">
              {[
                ['firstName', 'Nombre'],
                ['lastName', 'Apellido'],
                ['birthDate', 'Fecha de nacimiento', 'date'],
                ['documentNumber', 'CURP / INE'],
                ['phone', 'Telefono'],
                ['email', 'Correo electronico', 'email'],
                ['address', 'Direccion'],
                ['company', 'Ocupacion / Empresa'],
                ['position', 'Puesto'],
                ['monthlyIncome', 'Ingresos mensuales', 'number'],
                ['referenceName', 'Nombre de referencia'],
                ['referencePhone', 'Telefono de referencia'],
                ['referenceRelation', 'Relacion con la referencia'],
              ].map(([field, label, type = 'text']) => (
                <label key={field} className="block text-sm font-medium text-gray-700">
                  {label}
                  <input
                    type={type}
                    value={form[field]}
                    onChange={(event) => updateField(field, event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary"
                  />
                </label>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <img src={photo} alt="Foto cliente" className="aspect-square rounded-lg object-cover" />
                <img src={livenessPhoto} alt="Prueba de vida" className="aspect-square rounded-lg object-cover" />
              </div>
              <dl className="grid grid-cols-1 gap-2 text-sm">
                {Object.entries(form).map(([key, value]) => (
                  <div key={key} className="rounded border p-2">
                    <dt className="font-medium text-gray-500">{key}</dt>
                    <dd className="text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3 text-center">
              <Send className="mx-auto h-12 w-12 text-primary" />
              <p className="text-gray-700">Confirma el envio de tu registro.</p>
            </div>
          )}
        </div>

        <div className="flex justify-between border-t p-5">
          <Button type="button" variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0 || submitting}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Atras
          </Button>
          {step < 5 ? (
            <Button type="button" onClick={() => setStep(step + 1)} disabled={!canContinue()}>
              Siguiente
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={submit} disabled={submitting}>
              <Send className="mr-2 h-4 w-4" />
              {submitting ? 'Enviando...' : 'Enviar solicitud'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
