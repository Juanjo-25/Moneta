import { useState, type FormEvent, type ReactNode } from "react";
import { DataTable } from "../../components/DataTable";
import { DataTableHeader } from "../../components/DataTableHeader";
import { EmptyState } from "../../components/EmptyState";
import { FormActions } from "../../components/FormActions";
import { PrimaryActionButton } from "../../components/PrimaryActionButton";
import { SecondaryActionButton } from "../../components/SecondaryActionButton";
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
  onCreateSupplier: (input: SupplierFormState) => SupplierRecord;
  onSetSupplierActive: (supplierId: string, active: boolean) => void;
  onUpdateSupplier: (supplierId: string, input: SupplierFormState) => void;
  renderPayablesTable: (input: {
    supplierPayables: SupplierPayableRecord[];
    tableLabel: string;
  }) => ReactNode;
  supplierPayables: SupplierPayableRecord[];
  suppliers: SupplierRecord[];
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
  onSetSupplierActive,
  onUpdateSupplier,
  renderPayablesTable,
  supplierPayables,
  suppliers
}: SuppliersSectionProps) {
  const [form, setForm] = useState<SupplierFormState>(emptySupplierForm);
  const [errors, setErrors] = useState<SupplierFormErrors>({});
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
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
  }

  function submitSupplier(event: FormEvent<HTMLFormElement>) {
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
      onUpdateSupplier(editingSupplier.id, form);
      setEditingSupplierId(null);
    } else {
      onCreateSupplier(form);
      onCloseForm();
    }

    setForm(emptySupplierForm);
    setErrors({});
  }

  return (
    <section className="suppliers-layout">
      {formVisible || editingSupplier ? (
        <form className="customer-form" onSubmit={submitSupplier}>
          <div className="form-grid">
            <TextField
              error={errors.name}
              label="Nombre proveedor"
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

      {suppliers.length > 0 ? (
        <DataTable ariaLabel="Proveedores registrados">
          <DataTableHeader
            labels={[
              "Proveedor",
              "Documento",
              "Telefono",
              "Email",
              "Departamento",
              "Municipio",
              "Estado",
              "Accion"
            ]}
          />
          <tbody>
            {suppliers.map((supplier) => (
              <tr key={supplier.id}>
                <td>{supplier.name}</td>
                <td>{supplier.document || "Sin documento"}</td>
                <td>{supplier.phone || "Sin telefono"}</td>
                <td>{supplier.email || "Sin email"}</td>
                <td>{supplier.department || "Antioquia"}</td>
                <td>{supplier.city || "Sin municipio"}</td>
                <td>{supplier.active ? "Activo" : "Inactivo"}</td>
                <td>
                  <SecondaryActionButton
                    onClick={() => startEditingSupplier(supplier)}
                    variant="compact"
                  >
                    Editar proveedor {supplier.name}
                  </SecondaryActionButton>
                  <SecondaryActionButton
                    onClick={() => onSetSupplierActive(supplier.id, !supplier.active)}
                    variant="compact"
                  >
                    {supplier.active ? "Desactivar proveedor" : "Reactivar proveedor"}
                  </SecondaryActionButton>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      ) : (
        <EmptyState
          body="Crea proveedores para asociarlos a tus compras."
          className="section-empty"
          title="Sin proveedores registrados"
        />
      )}

      {supplierPayables.length > 0 ? (
        renderPayablesTable({
          supplierPayables,
          tableLabel: "Cuentas por pagar"
        })
      ) : (
        <EmptyState
          body="Las facturas pendientes de proveedor apareceran aqui."
          className="section-empty"
          title="Sin cuentas por pagar"
        />
      )}
    </section>
  );
}
