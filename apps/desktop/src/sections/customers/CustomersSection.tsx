import { useState, type FormEvent } from "react";
import { DataTable } from "../../components/DataTable";
import { DataTableHeader } from "../../components/DataTableHeader";
import { EmptyState } from "../../components/EmptyState";
import { SecondaryActionButton } from "../../components/SecondaryActionButton";
import { StatusBadge } from "../../components/StatusBadge";
import { SummaryCard } from "../../components/SummaryCard";
import { TextField } from "../../components/TextField";
import type {
  CustomerFormErrors,
  CustomerFormState,
  CustomerRecord,
  ReceivableRecord,
  SaleRecord
} from "../../types";

type CustomerSummary = {
  lastSaleLabel: string;
  pendingReceivableMinor: number;
  saleCount: number;
  totalSoldMinor: number;
};

type CustomersSectionProps = {
  buildCustomerSummary: (input: {
    customer: CustomerRecord;
    receivables: ReceivableRecord[];
    sales: SaleRecord[];
  }) => CustomerSummary;
  customers: CustomerRecord[];
  formatCurrency: (minor: number) => string;
  onCreateCustomer: (input: CustomerFormState) => CustomerRecord;
  onSetCustomerActive: (customerId: string, active: boolean) => void;
  onUpdateCustomer: (customerId: string, input: CustomerFormState) => void;
  onValidateCustomer: (
    input: CustomerFormState,
    currentCustomerId?: string | undefined
  ) => CustomerFormErrors;
  receivables: ReceivableRecord[];
  sales: SaleRecord[];
};

const emptyCustomerForm: CustomerFormState = {
  address: "",
  city: "",
  document: "",
  email: "",
  name: ""
};

export function CustomersSection({
  buildCustomerSummary,
  customers,
  formatCurrency,
  onCreateCustomer,
  onSetCustomerActive,
  onUpdateCustomer,
  onValidateCustomer,
  receivables,
  sales
}: CustomersSectionProps) {
  const [formVisible, setFormVisible] = useState(false);
  const [form, setForm] = useState<CustomerFormState>(emptyCustomerForm);
  const [errors, setErrors] = useState<CustomerFormErrors>({});
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CustomerFormState>(emptyCustomerForm);
  const [editErrors, setEditErrors] = useState<CustomerFormErrors>({});
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredCustomers = customers.filter((customer) => {
    if (normalizedSearch === "") {
      return true;
    }

    return [
      customer.name,
      customer.document,
      customer.address,
      customer.city,
      customer.email
    ].some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
  });
  const selectedCustomer =
    filteredCustomers.find((customer) => customer.id === selectedCustomerId) ??
    customers.find((customer) => customer.id === selectedCustomerId) ??
    null;
  const editingCustomer = editingCustomerId === selectedCustomer?.id ? selectedCustomer : null;
  const selectedCustomerSales = selectedCustomer
    ? sales.filter((sale) => sale.customerId === selectedCustomer.id)
    : [];
  const selectedCustomerReceivables = selectedCustomer
    ? receivables.filter((receivable) => receivable.customerId === selectedCustomer.id)
    : [];
  const selectedCustomerSummary = selectedCustomer
    ? buildCustomerSummary({ customer: selectedCustomer, receivables, sales })
    : null;

  function getCustomerFormState(customer: CustomerRecord): CustomerFormState {
    return {
      address: customer.address,
      city: customer.city,
      document: customer.document,
      email: customer.email,
      name: customer.name
    };
  }

  function updateField(field: keyof CustomerFormState, value: string) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  }

  function updateEditField(field: keyof CustomerFormState, value: string) {
    setEditForm((currentForm) => ({ ...currentForm, [field]: value }));
    setEditErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  }

  function selectCustomer(customer: CustomerRecord) {
    setSelectedCustomerId(customer.id);
    setEditingCustomerId(null);
    setEditForm(getCustomerFormState(customer));
    setEditErrors({});
    setFormVisible(false);
  }

  function startEditingCustomer(customer: CustomerRecord) {
    setEditingCustomerId(customer.id);
    setEditForm(getCustomerFormState(customer));
    setEditErrors({});
  }

  function submitCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = onValidateCustomer(form);

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    onCreateCustomer(form);
    setForm(emptyCustomerForm);
    setErrors({});
    setFormVisible(false);
  }

  function submitCustomerEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingCustomer) {
      return;
    }

    const nextErrors = onValidateCustomer(editForm, editingCustomer.id);

    setEditErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    onUpdateCustomer(editingCustomer.id, editForm);
    setEditErrors({});
    setEditingCustomerId(null);
  }

  return (
    <section className="customers-layout">
      <div className="customers-toolbar">
        <TextField
          label="Buscar clientes"
          onChange={setSearch}
          value={search}
        />
        <button
          className="primary-action"
          onClick={() => {
            setFormVisible((visible) => !visible);
            setEditingCustomerId(null);
            setEditErrors({});
          }}
          type="button"
        >
          Nuevo cliente
        </button>
      </div>

      {formVisible ? (
        <form className="customer-form" onSubmit={submitCustomer}>
          <div className="form-grid">
            <TextField
              error={errors.name}
              label="Nombre o razon social"
              onChange={(value) => updateField("name", value)}
              value={form.name}
            />
            <TextField
              error={errors.document}
              label="NIT o C.C."
              onChange={(value) => updateField("document", value)}
              value={form.document}
            />
            <TextField
              error={errors.address}
              label="Direccion"
              onChange={(value) => updateField("address", value)}
              value={form.address}
            />
            <TextField
              error={errors.city}
              label="Ciudad"
              onChange={(value) => updateField("city", value)}
              value={form.city}
            />
            <TextField
              error={errors.email}
              label="Email"
              onChange={(value) => updateField("email", value)}
              value={form.email}
            />
          </div>
          <div className="form-actions">
            <button type="submit">Guardar cliente</button>
          </div>
        </form>
      ) : null}

      {customers.length === 0 ? (
        <EmptyState
          body="Crea clientes para ventas y cartera."
          className="section-empty"
          title="Sin clientes registrados"
        />
      ) : filteredCustomers.length === 0 ? (
        <EmptyState
          body="Ajusta la busqueda para ver mas clientes."
          className="section-empty"
          title="Sin resultados"
        />
      ) : (
        <DataTable ariaLabel="Clientes registrados">
          <DataTableHeader
            labels={[
              "Cliente",
              "Documento",
              "Estado",
              "Total vendido",
              "Cartera",
              "Ultima venta",
              "Accion"
            ]}
          />
          <tbody>
            {filteredCustomers.map((customer) => {
              const summary = buildCustomerSummary({ customer, receivables, sales });

              return (
                <tr key={customer.id}>
                  <td>{customer.name}</td>
                  <td>{customer.document}</td>
                  <td>{customer.active ? "Activo" : "Inactivo"}</td>
                  <td>{formatCurrency(summary.totalSoldMinor)}</td>
                  <td>{formatCurrency(summary.pendingReceivableMinor)}</td>
                  <td>{summary.lastSaleLabel}</td>
                  <td>
                    <SecondaryActionButton
                      onClick={() => selectCustomer(customer)}
                      variant="compact"
                    >
                      Ver cliente {customer.name}
                    </SecondaryActionButton>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      )}

      {selectedCustomer ? (
        <section className="customer-file" aria-label="Ficha de cliente">
          <div className="section-heading">
            <div>
              <h2>{selectedCustomer.name}</h2>
              <p>{selectedCustomer.document}</p>
              <StatusBadge
                tone={selectedCustomer.active ? "active" : "inactive"}
                variant="pill"
              >
                {selectedCustomer.active ? "Activo" : "Inactivo"}
              </StatusBadge>
            </div>
            <div className="form-actions">
              <SecondaryActionButton
                onClick={() => startEditingCustomer(selectedCustomer)}
                variant="compact"
              >
                Editar cliente
              </SecondaryActionButton>
              <SecondaryActionButton
                onClick={() =>
                  onSetCustomerActive(selectedCustomer.id, !selectedCustomer.active)
                }
                variant="compact"
              >
                {selectedCustomer.active ? "Desactivar cliente" : "Reactivar cliente"}
              </SecondaryActionButton>
            </div>
          </div>

          {editingCustomer ? (
            <form className="customer-form" onSubmit={submitCustomerEdit}>
              <div className="form-grid">
                <TextField
                  error={editErrors.name}
                  label="Nombre o razon social"
                  onChange={(value) => updateEditField("name", value)}
                  value={editForm.name}
                />
                <TextField
                  error={editErrors.document}
                  label="NIT o C.C."
                  onChange={(value) => updateEditField("document", value)}
                  value={editForm.document}
                />
                <TextField
                  error={editErrors.address}
                  label="Direccion"
                  onChange={(value) => updateEditField("address", value)}
                  value={editForm.address}
                />
                <TextField
                  error={editErrors.city}
                  label="Ciudad"
                  onChange={(value) => updateEditField("city", value)}
                  value={editForm.city}
                />
                <TextField
                  error={editErrors.email}
                  label="Email"
                  onChange={(value) => updateEditField("email", value)}
                  value={editForm.email}
                />
              </div>
              <div className="form-actions">
                <button type="submit">Guardar cambios</button>
              </div>
            </form>
          ) : null}

          {selectedCustomerSummary ? (
            <div className="customer-summary" aria-label="Resumen del cliente">
              <SummaryCard
                label="Total vendido"
                value={formatCurrency(selectedCustomerSummary.totalSoldMinor)}
              />
              <SummaryCard
                label="Ventas"
                value={selectedCustomerSummary.saleCount}
              />
              <SummaryCard
                label="Cartera pendiente"
                value={formatCurrency(selectedCustomerSummary.pendingReceivableMinor)}
              />
              <SummaryCard
                label="Ultima venta"
                value={selectedCustomerSummary.lastSaleLabel}
              />
            </div>
          ) : null}

          {selectedCustomerSales.length > 0 ? (
            <DataTable ariaLabel="Historial de ventas del cliente">
              <DataTableHeader labels={["Fecha", "Producto", "Estado", "Total"]} />
              <tbody>
                {selectedCustomerSales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.occurredAtLabel}</td>
                    <td>{sale.productName}</td>
                    <td>{sale.paymentStatus === "paid" ? "Pagada" : "Pendiente"}</td>
                    <td>{formatCurrency(sale.totalMinor)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <EmptyState
              body="Las ventas apareceran cuando se registren movimientos."
              className="section-empty"
              title="Sin ventas del cliente"
            />
          )}

          {selectedCustomerReceivables.length > 0 ? (
            <DataTable ariaLabel="Cartera pendiente del cliente">
              <DataTableHeader labels={["Venta", "Vencimiento", "Saldo"]} />
              <tbody>
                {selectedCustomerReceivables.map((receivable) => (
                  <tr key={receivable.id}>
                    <td>{receivable.saleId}</td>
                    <td>{receivable.dueAt || "Sin vencimiento"}</td>
                    <td>{formatCurrency(receivable.amountMinor)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
