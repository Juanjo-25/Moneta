import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent
} from "react";
import { FormActions } from "../../components/FormActions";
import { PrimaryActionButton } from "../../components/PrimaryActionButton";
import { SecondaryActionButton } from "../../components/SecondaryActionButton";
import { TextField } from "../../components/TextField";
import type { AppSettings, CompanySettings, InvoiceDesignSettings } from "../../types";

type SettingsSectionProps = {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
};

const accentOptions = [
  { label: "Verde", value: "#0f766e" },
  { label: "Azul", value: "#2563eb" },
  { label: "Grafito", value: "#334155" },
  { label: "Vino", value: "#9f1239" }
];

export function SettingsSection({
  settings,
  onSettingsChange
}: SettingsSectionProps) {
  const [draftSettings, setDraftSettings] = useState<AppSettings>(settings);
  const [savedMessageVisible, setSavedMessageVisible] = useState(false);
  const hasUnsavedChanges =
    JSON.stringify(draftSettings) !== JSON.stringify(settings);

  useEffect(() => {
    setDraftSettings(settings);
  }, [settings]);

  function updateCompany(field: keyof CompanySettings, value: string) {
    setDraftSettings((currentSettings) => ({
      ...currentSettings,
      company: {
        ...currentSettings.company,
        [field]: value
      }
    }));
    setSavedMessageVisible(false);
  }

  function updateInvoice(field: keyof InvoiceDesignSettings, value: string) {
    setDraftSettings((currentSettings) => ({
      ...currentSettings,
      invoice: {
        ...currentSettings.invoice,
        [field]: value
      }
    }));
    setSavedMessageVisible(false);
  }

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.addEventListener("load", () => {
      updateCompany("logoDataUri", String(reader.result ?? ""));
    });
    reader.readAsDataURL(file);
  }

  function saveChanges(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSettingsChange(draftSettings);
    setSavedMessageVisible(true);
  }

  return (
    <form className="settings-layout" onSubmit={saveChanges}>
      <section className="section-form-shell settings-form">
        <div className="panel-header">
          <div>
            <h2>Empresa</h2>
            <span>Datos que se imprimen en el encabezado y pie de la factura.</span>
          </div>
        </div>

        <div className="form-grid">
          <TextField
            label="Nombre empresa"
            onChange={(value) => updateCompany("name", value)}
            value={draftSettings.company.name}
          />
          <TextField
            label="NIT empresa"
            onChange={(value) => updateCompany("document", value)}
            value={draftSettings.company.document}
          />
          <TextField
            label="Direccion empresa"
            onChange={(value) => updateCompany("address", value)}
            value={draftSettings.company.address}
          />
          <TextField
            label="Ciudad empresa"
            onChange={(value) => updateCompany("city", value)}
            value={draftSettings.company.city}
          />
          <TextField
            label="Email empresa"
            onChange={(value) => updateCompany("email", value)}
            type="email"
            value={draftSettings.company.email}
          />
          <TextField
            label="Telefono empresa"
            onChange={(value) => updateCompany("phone", value)}
            value={draftSettings.company.phone}
          />
          <label className="field settings-logo-field" htmlFor="company-logo">
            <span>Logo empresa</span>
            <input
              accept="image/png,image/jpeg,image/webp"
              id="company-logo"
              onChange={handleLogoChange}
              type="file"
            />
          </label>
        </div>

        {draftSettings.company.logoDataUri ? (
          <FormActions>
            <SecondaryActionButton
              onClick={() => updateCompany("logoDataUri", "")}
              type="button"
            >
              Quitar logo
            </SecondaryActionButton>
          </FormActions>
        ) : null}
      </section>

      <section className="section-form-shell settings-form">
        <div className="panel-header">
          <div>
            <h2>Factura</h2>
            <span>Textos y apariencia basica de la plantilla imprimible.</span>
          </div>
        </div>

        <div className="form-grid">
          <TextField
            label="Titulo factura"
            onChange={(value) => updateInvoice("title", value)}
            value={draftSettings.invoice.title}
          />
          <label className="field" htmlFor="invoice-accent">
            <span>Color principal</span>
            <select
              id="invoice-accent"
              onChange={(event) => updateInvoice("accentColor", event.target.value)}
              value={draftSettings.invoice.accentColor}
            >
              {accentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field field-wide" htmlFor="invoice-legal-note">
            <span>Nota legal</span>
            <textarea
              id="invoice-legal-note"
              onChange={(event) => updateInvoice("legalNote", event.target.value)}
              value={draftSettings.invoice.legalNote}
            />
          </label>
          <label className="field field-wide" htmlFor="invoice-observations">
            <span>Observaciones</span>
            <textarea
              id="invoice-observations"
              onChange={(event) => updateInvoice("observations", event.target.value)}
              value={draftSettings.invoice.observations}
            />
          </label>
        </div>
      </section>

      <FormActions>
        {savedMessageVisible ? (
          <span className="settings-save-message">Cambios guardados</span>
        ) : null}
        <PrimaryActionButton disabled={!hasUnsavedChanges} type="submit">
          Guardar cambios
        </PrimaryActionButton>
      </FormActions>

      <section className="section-form-shell settings-preview">
        <div className="settings-invoice-preview">
          <div
            className="settings-invoice-preview-header"
            style={{ backgroundColor: draftSettings.invoice.accentColor }}
          >
            {draftSettings.company.logoDataUri ? (
              <img alt="" src={draftSettings.company.logoDataUri} />
            ) : (
              <span>{draftSettings.company.name.trim().charAt(0) || "M"}</span>
            )}
            <div>
              <strong>{draftSettings.company.name || "Nombre de la empresa"}</strong>
              <small>
                {draftSettings.company.document || "NIT"} |{" "}
                {draftSettings.company.email || "correo@empresa.com"}
              </small>
            </div>
          </div>
          <div className="settings-invoice-preview-body">
            <strong>{draftSettings.invoice.title || "FACTURA DE VENTA"}</strong>
            <span>Cliente, detalle de productos, totales y firma autorizada.</span>
            <p>{draftSettings.invoice.observations}</p>
          </div>
        </div>
      </section>
    </form>
  );
}
