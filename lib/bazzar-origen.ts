/** Origen cliente — tabla entes (codigo 1-5). Ver holding ETAPA COMPRA-WEB-003. */

export const ENTES_CODIGO = {
  RIMEC: 1,
  FERNANDO: 2,
  SAN_MARTIN: 3,
  PALMA: 4,
  BAZZAR_WEB: 5,
} as const;

/** Cliente RIMEC canal e-commerce (FI / Compra Web / checkout). Hoy prueba Nexus → oficial Bazzar Web. */
export const CLIENTE_ID_BAZZAR_WEB = 5000;

export type OrigenClienteBazaar = {
  ente_codigo: number;
  tienda_cliente_id: number | null;
};

export function origenWeb(): OrigenClienteBazaar {
  return { ente_codigo: ENTES_CODIGO.BAZZAR_WEB, tienda_cliente_id: CLIENTE_ID_BAZZAR_WEB };
}
