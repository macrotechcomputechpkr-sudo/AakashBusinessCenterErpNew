-- Add ERP-grade columns to items
-- Features: UOM, tax category, HSN/SAC code, barcode, item type, batch tracking,
-- min/max stock, reorder qty, MRP, wholesale price, brand, valuation method, weight,
-- opening stock, GST rate, discount, supplier info, expiry tracking

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS uom text NOT NULL DEFAULT 'PCS',
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'goods'
    CHECK (item_type IN ('goods','service','non-inventory','assembly')),
  ADD COLUMN IF NOT EXISTS hsn_code text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS barcode text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tax_category text NOT NULL DEFAULT 'standard'
    CHECK (tax_category IN ('standard','zero_rated','exempt','nil_rated','special')),
  ADD COLUMN IF NOT EXISTS gst_rate numeric NOT NULL DEFAULT 13,
  ADD COLUMN IF NOT EXISTS mrp numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wholesale_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS brand text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS valuation_method text NOT NULL DEFAULT 'fifo'
    CHECK (valuation_method IN ('fifo','lifo','weighted_avg','standard_cost')),
  ADD COLUMN IF NOT EXISTS weight numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS weight_unit text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS min_stock numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_stock numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reorder_qty numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opening_stock numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS batch_tracked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expiry_tracked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supplier_id uuid DEFAULT NULL REFERENCES vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN items.uom IS 'Unit of measure (PCS, KG, LTR, BOX, etc.)';
COMMENT ON COLUMN items.item_type IS 'Type: goods, service, non-inventory, or assembly';
COMMENT ON COLUMN items.hsn_code IS 'HSN/SAC code for tax classification';
COMMENT ON COLUMN items.barcode IS 'Barcode/SKU for scanning';
COMMENT ON COLUMN items.tax_category IS 'Tax category: standard, zero_rated, exempt, nil_rated, special';
COMMENT ON COLUMN items.gst_rate IS 'Tax/GST rate percentage';
COMMENT ON COLUMN items.mrp IS 'Maximum retail price';
COMMENT ON COLUMN items.wholesale_price IS 'Wholesale/trade price';
COMMENT ON COLUMN items.discount_percent IS 'Default discount percentage';
COMMENT ON COLUMN items.brand IS 'Brand or manufacturer';
COMMENT ON COLUMN items.valuation_method IS 'Inventory valuation method';
COMMENT ON COLUMN items.weight IS 'Weight per unit';
COMMENT ON COLUMN items.weight_unit IS 'Weight unit (KG, G, etc.)';
COMMENT ON COLUMN items.min_stock IS 'Minimum stock level before reorder';
COMMENT ON COLUMN items.max_stock IS 'Maximum stock level';
COMMENT ON COLUMN items.reorder_qty IS 'Quantity to reorder when stock is low';
COMMENT ON COLUMN items.opening_stock IS 'Opening stock at start of fiscal year';
COMMENT ON COLUMN items.batch_tracked IS 'Whether item is tracked by batch numbers';
COMMENT ON COLUMN items.expiry_tracked IS 'Whether item has expiry date tracking';
