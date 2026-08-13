import { useState, type FormEvent, type ReactNode } from "react";
import { DataTable } from "../../components/DataTable";
import { DataTableHeader } from "../../components/DataTableHeader";
import { EmptyState } from "../../components/EmptyState";
import { FormActions } from "../../components/FormActions";
import { PrimaryActionButton } from "../../components/PrimaryActionButton";
import { SecondaryActionButton } from "../../components/SecondaryActionButton";
import { StatusBadge } from "../../components/StatusBadge";
import { TextField } from "../../components/TextField";
import type {
  SupplierFormErrors,
  SupplierFormState,
  SupplierPayableRecord,
  SupplierRecord
} from "../../types";

type SuppliersSectionProps = {
  formVisible: boolean;
  onCloseForm: () => void;
  onCreateSupplier: (input: SupplierFormState) => Promise<SupplierRecord | null>;
  onDeleteSupplier: (supplierId: string) => Promise<string | null>;
  onSetSupplierActive: (supplierId: string, active: boolean) => Promise<boolean>;
  onUpdateSupplier: (
    supplierId: string,
    input: SupplierFormState
  ) => Promise<boolean>;
  renderPayablesTable: (input: {
    supplierPayables: SupplierPayableRecord[];
    tableLabel: string;
  }) => ReactNode;
  supplierPayables: SupplierPayableRecord[];
  suppliers: SupplierRecord[];
};

type SupplierDeleteNotice = {
  kind: "error" | "success";
  message: string;
};

const emptySupplierForm: SupplierFormState = {
  address: "",
  city: "",
  department: "Antioquia",
  document: "",
  email: "",
  name: "",
  phone: ""
};

const antioquiaMunicipalities = [
  "Abejorral",
  "Abriaqui",
  "Alejandria",
  "Amaga",
  "Amalfi",
  "Andes",
  "Angelopolis",
  "Angostura",
  "Anori",
  "Anza",
  "Apartado",
  "Arboletes",
  "Argelia",
  "Armenia",
  "Barbosa",
  "Bello",
  "Belmira",
  "Betania",
  "Betulia",
  "Briceño",
  "Buritica",
  "Caceres",
  "Caicedo",
  "Caldas",
  "Campamento",
  "Cañasgordas",
  "Caracoli",
  "Caramanta",
  "Carepa",
  "Carolina del Principe",
  "Caucasia",
  "Chigorodo",
  "Cisneros",
  "Ciudad Bolivar",
  "Cocorna",
  "Concepcion",
  "Concordia",
  "Copacabana",
  "Dabeiba",
  "Donmatias",
  "Ebejico",
  "El Bagre",
  "El Carmen de Viboral",
  "El Peñol",
  "El Retiro",
  "El Santuario",
  "Entrerrios",
  "Envigado",
  "Fredonia",
  "Frontino",
  "Giraldo",
  "Girardota",
  "Gomez Plata",
  "Granada",
  "Guadalupe",
  "Guarne",
  "Guatape",
  "Heliconia",
  "Hispania",
  "Itagui",
  "Ituango",
  "Jardin",
  "Jerico",
  "La Ceja",
  "La Estrella",
  "La Pintada",
  "La Union",
  "Liborina",
  "Maceo",
  "Marinilla",
  "Medellin",
  "Montebello",
  "Murindo",
  "Mutata",
  "Nariño",
  "Nechi",
  "Necocli",
  "Olaya",
  "Peque",
  "Pueblorrico",
  "Puerto Berrio",
  "Puerto Nare",
  "Puerto Triunfo",
  "Remedios",
  "Rionegro",
  "Sabanalarga",
  "Sabaneta",
  "Salgar",
  "San Andres de Cuerquia",
  "San Carlos",
  "San Francisco",
  "San Jeronimo",
  "San Jose de la Montaña",
  "San Juan de Uraba",
  "San Luis",
  "San Pedro de los Milagros",
  "San Pedro de Uraba",
  "San Rafael",
  "San Roque",
  "San Vicente Ferrer",
  "Santa Barbara",
  "Santa Fe de Antioquia",
  "Santa Rosa de Osos",
  "Santo Domingo",
  "Segovia",
  "Sonson",
  "Sopetran",
  "Tamesis",
  "Taraza",
  "Tarso",
  "Titiribi",
  "Toledo",
  "Turbo",
  "Uramita",
  "Urrao",
  "Valdivia",
  "Valparaiso",
  "Vegachi",
  "Venecia",
  "Vigia del Fuerte",
  "Yali",
  "Yarumal",
  "Yolombo",
  "Yondo",
  "Zaragoza"
];

export function SuppliersSection({
  formVisible,
  onCloseForm,
  onCreateSupplier,
  onDeleteSupplier,
  onSetSupplierActive,
  onUpdateSupplier,
  renderPayablesTable,
  supplierPayables,
  suppliers
}: SuppliersSectionProps) {
  const [form, setForm] = useState<SupplierFormState>(emptySupplierForm);
  const [errors, setErrors] = useState<SupplierFormErrors>({});
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<SupplierRecord | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<SupplierDeleteNotice | null>(null);
  const editingSupplier =
    suppliers.find((supplier) => supplier.id === editingSupplierId) ?? null;

  function getSupplierFormState(supplier: SupplierRecord): SupplierFormState {
    return {
      address: supplier.address,
      city: supplier.city,
      department: supplier.department,
      document: supplier.document,
      email: supplier.email,
      name: supplier.name,
      phone: supplier.phone
    };
  }

  function updateField(field: keyof SupplierFormState, value: string) {
    setForm((currentForm) => {
      if (field === "department") {
        return {
          ...currentForm,
          department: value,
          city: value.trim() !== "Antioquia" ? "" : currentForm.city
        };
      }

      return { ...currentForm, [field]: value };
    });
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  }

  function startEditingSupplier(supplier: SupplierRecord) {
    setEditingSupplierId(supplier.id);
    setForm(getSupplierFormState(supplier));
    setErrors({});
    setDeleteCandidate(null);
  }

  function startDeletingSupplier(supplier: SupplierRecord) {
    setDeleteCandidate(supplier);
    setDeleteNotice(null);
    setEditingSupplierId(null);
    setErrors({});
  }

  async function submitSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: SupplierFormErrors = {};

    if (form.name.trim() === "") {
      nextErrors.name = "El nombre del proveedor es obligatorio.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (editingSupplier) {
      const updated = await onUpdateSupplier(editingSupplier.id, form);

      if (!updated) {
        return;
      }

      setEditingSupplierId(null);
    } else {
      const supplier = await onCreateSupplier(form);

      if (!supplier) {
        return;
      }

      onCloseForm();
    }

    setForm(emptySupplierForm);
    setErrors({});
  }

  async function confirmSupplierDeletion() {
    if (!deleteCandidate) {
      return;
    }

    const deletedSupplier = deleteCandidate;
    const error = await onDeleteSupplier(deletedSupplier.id);

    if (error) {
      setDeleteNotice({
        kind: "error",
        message: error
      });
      return;
    }

    if (editingSupplierId === deletedSupplier.id) {
      setEditingSupplierId(null);
      setErrors({});
    }

    setDeleteCandidate(null);
    setDeleteNotice({
      kind: "success",
      message: `${deletedSupplier.name} eliminado de proveedores.`
    });
  }

  return (
    <section className="suppliers-layout">
      {formVisible || editingSupplier ? (
        <form className="customer-form section-form-shell" onSubmit={submitSupplier}>
          <div className="form-grid">
            <TextField
              error={errors.name}
              label="Razón social"
              onChange={(value) => updateField("name", value)}
              value={form.name}
            />
            <TextField
              error={errors.document}
              label="NIT o C.C. proveedor"
              onChange={(value) => updateField("document", value)}
              value={form.document}
            />
            <TextField
              error={errors.phone}
              label="Telefono proveedor"
              onChange={(value) => updateField("phone", value)}
              value={form.phone}
            />
            <TextField
              error={errors.email}
              label="Email proveedor"
              onChange={(value) => updateField("email", value)}
              value={form.email}
            />
            <TextField
              error={errors.address}
              label="Direccion proveedor"
              onChange={(value) => updateField("address", value)}
              value={form.address}
            />
            <TextField
              error={errors.department}
              label="Departamento"
              onChange={(value) => updateField("department", value)}
              value={form.department}
            />
            {form.department.trim() === "Antioquia" ? (
              <label className="field" htmlFor="municipio-proveedor">
                <span>Municipio</span>
                <select
                  id="municipio-proveedor"
                  onChange={(event) => updateField("city", event.target.value)}
                  value={form.city}
                >
                  <option value="">Selecciona un municipio</option>
                  {antioquiaMunicipalities.map((municipality) => (
                    <option key={municipality} value={municipality}>
                      {municipality}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <TextField
                error={errors.city}
                label="Municipio"
                onChange={(value) => updateField("city", value)}
                value={form.city}
              />
            )}
          </div>
          <FormActions>
            <PrimaryActionButton type="submit">
              {editingSupplier ? "Guardar cambios proveedor" : "Guardar proveedor"}
            </PrimaryActionButton>
          </FormActions>
        </form>
      ) : null}

      {deleteNotice ? (
        <p
          className={deleteNotice.kind === "error" ? "form-error" : "form-success"}
          role={deleteNotice.kind === "error" ? "alert" : "status"}
        >
          {deleteNotice.message}
        </p>
      ) : null}

      {deleteCandidate ? (
        <section
          aria-label="Confirmar eliminacion de proveedor"
          className="product-delete-confirmation section-surface"
        >
          <div>
            <h2>Confirmar eliminacion</h2>
            <p>
              Se quitara {deleteCandidate.name} del catalogo activo de proveedores.
              Las compras, cuentas por pagar y abonos historicos conservaran sus
              datos guardados.
            </p>
          </div>
          <FormActions>
            <SecondaryActionButton
              onClick={() => setDeleteCandidate(null)}
              type="button"
              variant="compact"
            >
              Cancelar
            </SecondaryActionButton>
            <PrimaryActionButton onClick={confirmSupplierDeletion} type="button">
              Confirmar eliminacion
            </PrimaryActionButton>
          </FormActions>
        </section>
      ) : null}

      <section
        aria-labelledby="suppliers-directory-title"
        className="suppliers-block suppliers-directory-block"
      >
        <div className="suppliers-block-header">
          <div>
            <h2 id="suppliers-directory-title">Directorio de proveedores</h2>
            <p>Contactos activos para compras y pagos.</p>
          </div>
          <span className="suppliers-count-pill">
            {suppliers.length} {suppliers.length === 1 ? "proveedor" : "proveedores"}
          </span>
        </div>

        {suppliers.length > 0 ? (
          <DataTable ariaLabel="Proveedores registrados" className="suppliers-directory-table">
            <DataTableHeader
              labels={[
                "Proveedor",
                "Documento",
                "Telefono",
                "Email",
                "Ubicacion",
                "Estado",
                "Acciones"
              ]}
            />
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td>{supplier.name}</td>
                  <td>{supplier.document || "Sin documento"}</td>
                  <td>{supplier.phone || "Sin telefono"}</td>
                  <td>{supplier.email || "Sin email"}</td>
                  <td>
                    <span className="supplier-location-cell">
                      <span>{supplier.department || "Antioquia"}</span>
                      <small>{supplier.city || "Sin municipio"}</small>
                    </span>
                  </td>
                  <td>
                    <StatusBadge
                      tone={supplier.active ? "active" : "inactive"}
                      variant="pill"
                    >
                      {supplier.active ? "Activo" : "Inactivo"}
                    </StatusBadge>
                  </td>
                  <td className="supplier-actions-cell">
                    <div className="supplier-row-actions">
                      <SecondaryActionButton
                        aria-label={`Editar proveedor ${supplier.name}`}
                        onClick={() => startEditingSupplier(supplier)}
                        variant="compact"
                      >
                        Editar
                      </SecondaryActionButton>
                      <SecondaryActionButton
                        aria-label={
                          supplier.active ? "Desactivar proveedor" : "Reactivar proveedor"
                        }
                        onClick={() => {
                          void onSetSupplierActive(supplier.id, !supplier.active);
                        }}
                        variant="compact"
                      >
                        {supplier.active ? "Desactivar" : "Reactivar"}
                      </SecondaryActionButton>
                      <SecondaryActionButton
                        className="danger-action"
                        onClick={() => startDeletingSupplier(supplier)}
                        variant="compact"
                      >
                        Eliminar
                      </SecondaryActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState
            body="Crea proveedores para asociarlos a tus compras."
            className="section-empty suppliers-empty-state"
            title="Sin proveedores registrados"
          />
        )}
      </section>

      <section
        aria-labelledby="suppliers-payables-title"
        className="suppliers-block suppliers-payables-block"
      >
        <div className="suppliers-block-header">
          <div>
            <h2 id="suppliers-payables-title">Cuentas por pagar</h2>
            <p>Facturas pendientes asociadas a proveedores.</p>
          </div>
          <span className="suppliers-count-pill">
            {supplierPayables.length}{" "}
            {supplierPayables.length === 1 ? "cuenta" : "cuentas"}
          </span>
        </div>

        {supplierPayables.length > 0 ? (
          renderPayablesTable({
            supplierPayables,
            tableLabel: "Cuentas por pagar"
          })
        ) : (
          <EmptyState
            body="Las facturas pendientes de proveedor apareceran aqui."
            className="section-empty suppliers-empty-state"
            title="Sin cuentas por pagar"
          />
        )}
      </section>
    </section>
  );
}
