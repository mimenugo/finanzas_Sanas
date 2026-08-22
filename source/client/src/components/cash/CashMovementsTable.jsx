import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cashService } from '../../services/cashService';
import { formatCurrency, formatDate } from '../../lib/utils';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';

export default function CashMovementsTable({ cash, onClose }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });

  useEffect(() => {
    loadMovements();
  }, [cash.id, filters]);

  const loadMovements = async () => {
    try {
      setLoading(true);
      const response = await cashService.getCashMovements(cash.id, filters);
      setMovements(response.data.movements);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error al cargar movimientos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {cash.name} - Movimientos
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Saldo actual: {formatCurrency(cash.balance)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={filters.type || 'ALL'}
            onValueChange={(value) => setFilters({ ...filters, type: value === 'ALL' ? '' : value, page: 1 })}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="INCOME">Ingresos</SelectItem>
              <SelectItem value="EXPENSE">Egresos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : movements.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No hay movimientos registrados</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Fecha
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Tipo
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Concepto
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Usuario
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Referencia
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Monto
                  </th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr
                    key={movement.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                      {formatDate(movement.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {movement.type === 'INCOME' ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <Badge variant={movement.type === 'INCOME' ? 'success' : 'destructive'}>
                          {movement.type === 'INCOME' ? 'Ingreso' : 'Egreso'}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                      <div>
                        <p className="font-medium">{movement.concept}</p>
                        {movement.observations && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {movement.observations}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                      {movement.user.fullName}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                      {movement.reference || '-'}
                    </td>
                    <td className={`py-3 px-4 text-sm text-right font-semibold ${
                      movement.type === 'INCOME' 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {movement.type === 'INCOME' ? '+' : '-'}{formatCurrency(movement.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Mostrando {movements.length} de {pagination.total} movimientos
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page === 1}
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page === pagination.pages}
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}