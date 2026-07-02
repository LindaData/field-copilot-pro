import { useTranslation } from "react-i18next";

/**
 * Dynamic-text translation layer for data values that live in the seed
 * (job complaints, access notes, ad-hoc status notes). The dictionary covers
 * every deterministic string emitted from src/lib/seed.ts so that switching
 * the UI language also translates customer-facing job text.
 *
 * For any string not in the dictionary we fall back to the original text.
 * If a future build wires up an AI translation gateway, plug the call into
 * `translateDynamic` and cache results here.
 */
const ES: Record<string, string> = {
  // ─── COMPLAINTS array ────────────────────────────────────────────
  "No cooling. System runs but blowing warm.": "Sin enfriamiento. El sistema funciona pero sopla aire caliente.",
  "No heat — thermostat calling, no warm air.": "Sin calefacción — el termostato pide calor, no sale aire caliente.",
  "Weak cooling, room not reaching set point.": "Enfriamiento débil, la habitación no alcanza la temperatura programada.",
  "Frozen evaporator coil observed at indoor unit.": "Serpentín del evaporador congelado en la unidad interior.",
  "Water leak at indoor unit.": "Fuga de agua en la unidad interior.",
  "Drain blockage causing overflow.": "Obstrucción del drenaje causando desbordamiento.",
  "Poor airflow across the home.": "Flujo de aire deficiente en toda la casa.",
  "Blower not running on heat call.": "El ventilador no funciona al pedir calefacción.",
  "Outdoor unit not running.": "La unidad exterior no funciona.",
  "Compressor humming, not starting.": "El compresor zumba pero no arranca.",
  "Short cycling every few minutes.": "Ciclos cortos cada pocos minutos.",
  "Unusual noise from outdoor unit.": "Ruido inusual en la unidad exterior.",
  "Thermostat shows offline intermittently.": "El termostato aparece desconectado de forma intermitente.",
  "Electrical issue — breaker tripped.": "Problema eléctrico — disyuntor disparado.",
  "Furnace ignition failure.": "Falla de encendido del calentador.",
  "Flame-sensing intermittent fault.": "Falla intermitente del sensor de llama.",
  "Pressure switch trip on heating call.": "Disparo del presostato al pedir calefacción.",
  "Heat-pump defrost concern, ice buildup.": "Problema de descongelación de la bomba de calor, acumulación de hielo.",
  "Auxiliary heat staying on, high bill.": "Calor auxiliar siempre encendido, factura alta.",
  "Mini-split communication error displayed.": "Error de comunicación del mini-split en pantalla.",
  "One ductless zone not operating.": "Una zona sin ductos no funciona.",
  "IAQ accessory service request.": "Solicitud de servicio de accesorio de calidad de aire interior.",
  "Preventive maintenance — seasonal.": "Mantenimiento preventivo — estacional.",
  "Installation inspection following replacement.": "Inspección de instalación tras un reemplazo.",
  "System commissioning checklist.": "Lista de verificación de puesta en marcha del sistema.",
  "Warranty visit — compressor concern.": "Visita de garantía — problema del compresor.",
  "Callback — same complaint as prior visit.": "Revisita — misma queja que la visita anterior.",
  "Second visit to install ordered part.": "Segunda visita para instalar la pieza pedida.",

  // ─── Unknown-equipment seed complaints ───────────────────────────
  "No cooling. Customer does not know unit model — needs identification on arrival.":
    "Sin enfriamiento. El cliente no conoce el modelo — requiere identificación al llegar.",
  "Strange noise from outdoor unit. New homeowner — equipment unknown.":
    "Ruido extraño en la unidad exterior. Propietario nuevo — equipo desconocido.",
  "Furnace not igniting. Rental property — manager unsure of brand or model.":
    "El calentador no enciende. Propiedad en alquiler — el administrador no conoce la marca o el modelo.",
  "Mini-split zone offline. Equipment not on file. To be identified on site.":
    "Zona del mini-split desconectada. Equipo no registrado. A identificar en sitio.",

  // ─── Status-driven complaint overrides ───────────────────────────
  "Part needed — not on hand. Awaiting delivery.": "Pieza necesaria — no disponible. En espera de entrega.",
  "Estimate sent, waiting for customer decision.": "Presupuesto enviado, esperando decisión del cliente.",
  "Customer cancelled — issue resolved itself.": "Cliente canceló — el problema se resolvió solo.",
  "Warranty service visit.": "Visita de servicio en garantía.",

  // ─── Access notes ────────────────────────────────────────────────
  "Gate keypad at vehicle entrance. Dog in back yard.": "Teclado del portón en la entrada de vehículos. Perro en el patio trasero.",
  "Side gate unlocked": "Portón lateral sin llave",
  "Call on arrival": "Llamar al llegar",
  "Use service door": "Usar puerta de servicio",
  "Office key at front": "Llave de oficina en la entrada",
};

export function translateDynamic(text: string | undefined | null, lang: string): string {
  if (!text) return "";
  if (!lang.startsWith("es")) return text;
  return ES[text.trim()] ?? text;
}

export function useDynamicText() {
  const { i18n } = useTranslation();
  return (text: string | undefined | null) => translateDynamic(text, i18n.language);
}
