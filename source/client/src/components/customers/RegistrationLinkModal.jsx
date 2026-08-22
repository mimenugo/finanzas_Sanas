import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { customerService } from '@/services/customerService';
import { Check, Copy, Link, MessageCircle, X } from 'lucide-react';
import { toast } from 'sonner';

export default function RegistrationLinkModal({ open, onClose }) {
  const [requireGuarantor, setRequireGuarantor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState(null);

  const generateLink = async () => {
    try {
      setLoading(true);
      const data = await customerService.createRegistrationLink({
        purpose: 'CLIENT',
        requireGuarantor,
        expiresInDays: 7,
      });
      setLink(data);
      toast.success('Enlace generado correctamente');
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo generar el enlace');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(link.url);
    toast.success('Enlace copiado al portapapeles');
  };

  const whatsappUrl = link
    ? `https://wa.me/?text=${encodeURIComponent(`Hola, completa tu registro en este enlace: ${link.url}`)}`
    : '#';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicitar registro al cliente</DialogTitle>
          <DialogDescription>
            Genera un enlace unico y seguro para que el cliente complete su registro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
            <input
              type="checkbox"
              checked={requireGuarantor}
              onChange={(event) => setRequireGuarantor(event.target.checked)}
              className="h-4 w-4"
            />
            El cliente requiere aval
          </label>

          {!link ? (
            <Button onClick={generateLink} disabled={loading} className="w-full">
              <Link className="mr-2 h-4 w-4" />
              {loading ? 'Generando...' : 'Generar enlace'}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border bg-gray-50 p-3 text-sm break-all">
                {link.url}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button type="button" onClick={copyLink}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar
                </Button>
                <Button asChild type="button" variant="outline">
                  <a href={whatsappUrl} target="_blank" rel="noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    WhatsApp
                  </a>
                </Button>
              </div>
              <p className="flex items-center gap-2 text-sm text-green-700">
                <Check className="h-4 w-4" />
                Vence: {new Date(link.expiresAt).toLocaleString()}
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" />
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
