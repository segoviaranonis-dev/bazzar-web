-- Punto de entrega mapa · Delivery Bazzar · CHUSAR 2.5.1.28
ALTER TABLE pedido_web
  ADD COLUMN IF NOT EXISTS entrega_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS entrega_lng DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_pedido_web_entrega_geo
  ON pedido_web (entrega_lat, entrega_lng)
  WHERE entrega_lat IS NOT NULL;
