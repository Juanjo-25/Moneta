import { jsPDF } from "jspdf";
function formatCurrency(minor) {
    const amount = new Intl.NumberFormat("es-CO", {
        maximumFractionDigits: 0
    }).format(minor);
    return `$ ${amount}`;
}
function fieldValue(value) {
    return value.trim() === "" ? "No registrado" : value.trim();
}
function parseHexColor(hex) {
    const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "475569";
    return [
        Number.parseInt(normalized.slice(0, 2), 16),
        Number.parseInt(normalized.slice(2, 4), 16),
        Number.parseInt(normalized.slice(4, 6), 16)
    ];
}
function getInvoiceSettings(settings) {
    return {
        company: {
            address: settings?.company.address ?? "Calle 00 # 00-00",
            city: settings?.company.city ?? "Colombia",
            document: settings?.company.document ?? "900.123.456-7",
            email: settings?.company.email ?? "contacto@empresa.com",
            logoDataUri: settings?.company.logoDataUri ?? "",
            name: settings?.company.name ?? "NOMBRE DE LA EMPRESA S.A.S.",
            phone: settings?.company.phone ?? ""
        },
        invoice: {
            accentColor: settings?.invoice.accentColor ?? "#475569",
            legalNote: settings?.invoice.legalNote ??
                "Plantilla visual imprimible. No corresponde a una factura electronica DIAN ni incluye CUFE real.",
            observations: settings?.invoice.observations ??
                "Observaciones: factura generada desde Moneta para impresion.",
            title: settings?.invoice.title ?? "FACTURA DE VENTA"
        }
    };
}
function getLogoImageFormat(dataUri) {
    if (dataUri.startsWith("data:image/jpeg") || dataUri.startsWith("data:image/jpg")) {
        return "JPEG";
    }
    if (dataUri.startsWith("data:image/webp")) {
        return "WEBP";
    }
    return "PNG";
}
function buildCompanyDocumentLine(company) {
    return [
        `NIT / C.C.: ${fieldValue(company.document)}`,
        fieldValue(company.address),
        company.phone.trim() === "" ? "" : `Tel: ${company.phone.trim()}`
    ]
        .filter(Boolean)
        .join(" | ");
}
export function buildInvoiceFileName(invoiceNumber) {
    return `factura-${invoiceNumber}.pdf`;
}
export function buildInvoicePaymentLabel(status) {
    return status === "paid" ? "Contado" : "Credito";
}
function writeText(doc, text, x, y, options) {
    doc.text(text, x, y, options);
}
function fitText(text, maxLength) {
    const value = text.trim();
    if (value.length <= maxLength) {
        return value;
    }
    return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}
export function generateInvoicePdf(input) {
    const doc = new jsPDF({ format: "a4", unit: "mm" });
    const settings = getInvoiceSettings(input.settings);
    const [accentRed, accentGreen, accentBlue] = parseHexColor(settings.invoice.accentColor);
    const paymentLabel = buildInvoicePaymentLabel(input.paymentStatus);
    const items = input.items ?? (input.item ? [input.item] : []);
    const totalMinor = items.reduce((total, item) => total + item.totalMinor, 0);
    const subtotal = formatCurrency(totalMinor);
    const total = formatCurrency(totalMinor);
    const hasLogo = settings.company.logoDataUri.trim() !== "";
    doc.setDrawColor(72, 72, 72);
    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    if (hasLogo) {
        try {
            doc.addImage(settings.company.logoDataUri, getLogoImageFormat(settings.company.logoDataUri), 18, 15, 24, 24);
        }
        catch {
            doc.setDrawColor(accentRed, accentGreen, accentBlue);
            doc.rect(18, 15, 24, 24);
        }
    }
    else {
        doc.setDrawColor(accentRed, accentGreen, accentBlue);
        doc.rect(18, 15, 24, 24);
        doc.setFontSize(9);
        doc.setTextColor(accentRed, accentGreen, accentBlue);
        writeText(doc, "Logo", 30, 29, { align: "center" });
    }
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(13);
    writeText(doc, fieldValue(settings.company.name), 105, 18, { align: "center" });
    doc.setFontSize(10);
    writeText(doc, buildCompanyDocumentLine(settings.company), 105, 25, {
        align: "center",
        maxWidth: 84
    });
    writeText(doc, fieldValue(settings.company.email), 105, 37, { align: "center" });
    doc.setFontSize(10);
    writeText(doc, fieldValue(settings.invoice.title), 174, 25, { align: "center" });
    doc.setFontSize(12);
    writeText(doc, `No. ${input.invoiceNumber}`, 174, 33, { align: "center" });
    const clientTop = 48;
    const leftLabelWidth = 24;
    const rightLabelX = 162;
    const rightWidth = 36;
    const rowHeight = 7;
    doc.setFillColor(accentRed, accentGreen, accentBlue);
    doc.rect(12, clientTop, leftLabelWidth, rowHeight, "F");
    doc.rect(12, clientTop + rowHeight, leftLabelWidth, rowHeight, "F");
    doc.rect(12, clientTop + rowHeight * 2, leftLabelWidth, rowHeight, "F");
    doc.rect(12, clientTop + rowHeight * 3, leftLabelWidth, rowHeight, "F");
    doc.rect(rightLabelX, clientTop, rightWidth, rowHeight, "F");
    doc.rect(rightLabelX, clientTop + rowHeight * 2, rightWidth, rowHeight, "F");
    doc.rect(12, clientTop, 186, rowHeight * 4);
    doc.line(36, clientTop, 36, clientTop + rowHeight * 4);
    doc.line(rightLabelX, clientTop, rightLabelX, clientTop + rowHeight * 4);
    doc.line(12, clientTop + rowHeight, 198, clientTop + rowHeight);
    doc.line(12, clientTop + rowHeight * 2, 198, clientTop + rowHeight * 2);
    doc.line(12, clientTop + rowHeight * 3, 198, clientTop + rowHeight * 3);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    writeText(doc, "SENOR(ES)", 24, clientTop + 4.8, { align: "center" });
    writeText(doc, "DIRECCION", 24, clientTop + 11.8, { align: "center" });
    writeText(doc, "CIUDAD", 24, clientTop + 18.8, { align: "center" });
    writeText(doc, "TELEFONO", 24, clientTop + 25.8, { align: "center" });
    doc.setFontSize(6.3);
    writeText(doc, "FECHA DE EXPEDICION", 180, clientTop + 4.8, {
        align: "center"
    });
    writeText(doc, "FECHA DE VENCIMIENTO", 180, clientTop + 18.8, {
        align: "center"
    });
    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    writeText(doc, fitText(fieldValue(input.customer.name), 48), 38, clientTop + 5, {
        maxWidth: 120
    });
    writeText(doc, fitText(fieldValue(input.customer.address), 48), 38, clientTop + 12, {
        maxWidth: 120
    });
    writeText(doc, fitText(fieldValue(input.customer.city), 48), 38, clientTop + 19, {
        maxWidth: 120
    });
    writeText(doc, `Email: ${fitText(fieldValue(input.customer.email), 32)}`, 38, clientTop + 26, { maxWidth: 72 });
    writeText(doc, `CC/NIT ${fitText(fieldValue(input.customer.document), 22)}`, 114, clientTop + 26, { maxWidth: 44 });
    writeText(doc, input.issueDate, 180, clientTop + 12, { align: "center" });
    writeText(doc, input.issueDate, 180, clientTop + 26, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    writeText(doc, `Forma de pago: ${paymentLabel}`, 198, 82, { align: "right" });
    const tableTop = 87;
    const tableBottom = 239;
    const columns = [12, 98, 125, 148, 170, 198];
    doc.setFillColor(accentRed, accentGreen, accentBlue);
    doc.rect(12, tableTop, 186, 8, "F");
    doc.rect(12, tableTop, 186, tableBottom - tableTop);
    columns.slice(1, -1).forEach((x) => doc.line(x, tableTop, x, tableBottom));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    writeText(doc, "Item", 55, tableTop + 5, { align: "center" });
    writeText(doc, "Precio", 111, tableTop + 5, { align: "center" });
    writeText(doc, "Cantidad", 136, tableTop + 5, { align: "center" });
    writeText(doc, "Descuento", 159, tableTop + 5, { align: "center" });
    writeText(doc, "Total", 184, tableTop + 5, { align: "center" });
    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    items.forEach((item, index) => {
        const textY = tableTop + 15 + index * 6;
        if (textY > tableBottom - 8) {
            return;
        }
        writeText(doc, fitText(item.description.toUpperCase(), 42), 14, textY, {
            maxWidth: 80
        });
        writeText(doc, formatCurrency(item.unitPriceMinor), 123, textY, {
            align: "right"
        });
        writeText(doc, String(item.quantity), 136, textY, { align: "center" });
        writeText(doc, "0.00%", 159, textY, { align: "center" });
        writeText(doc, formatCurrency(item.totalMinor), 196, textY, { align: "right" });
    });
    doc.setFillColor(accentRed, accentGreen, accentBlue);
    doc.rect(12, tableBottom - 7, 120, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    writeText(doc, fitText(fieldValue(settings.invoice.legalNote), 64), 14, tableBottom - 2, {
        maxWidth: 112
    });
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    writeText(doc, "Subtotal", 168, 245, { align: "right" });
    writeText(doc, subtotal, 196, 245, { align: "right" });
    writeText(doc, "IVA (0.00%)", 168, 252, { align: "right" });
    writeText(doc, "$ 0", 196, 252, { align: "right" });
    doc.setFillColor(accentRed, accentGreen, accentBlue);
    doc.rect(137, 256, 61, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    writeText(doc, "Total", 168, 261, { align: "right" });
    writeText(doc, total, 196, 261, { align: "right" });
    doc.setTextColor(17, 24, 39);
    doc.setDrawColor(72, 72, 72);
    doc.line(18, 281, 68, 281);
    doc.line(80, 281, 132, 281);
    doc.setFontSize(8);
    writeText(doc, "ELABORADO POR", 43, 286, { align: "center" });
    writeText(doc, "ACEPTADA, FIRMA Y/O SELLO Y FECHA", 106, 286, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    writeText(doc, fieldValue(settings.invoice.observations), 12, 292, {
        maxWidth: 186
    });
    return {
        dataUri: doc.output("datauristring"),
        fileName: buildInvoiceFileName(input.invoiceNumber)
    };
}
