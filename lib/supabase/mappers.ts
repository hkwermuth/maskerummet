// camelCase ↔ snake_case mappers for yarn_items, yarn_usage og projects.
// Bruges udelukkende af SPA-komponenter (Garnlager, Arkiv, BrugNoeglerModal).

// ── yarn_items ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toDb(yarn: Record<string, any>) {
  return {
    name:            yarn.name          || null,
    brand:           yarn.brand         || null,
    color_name:      yarn.colorName     || null,
    color_code:      yarn.colorCode     || null,
    color_category:  yarn.colorCategory || null,
    fiber:           yarn.fiber         || null,
    yarn_weight:     yarn.weight        || null,
    gauge:           yarn.pindstr       || null,
    meters:          yarn.metrage       ? Number(yarn.metrage) : null,
    barcode:         yarn.barcode       || null,
    image_url:       yarn.imageUrl      ?? null,
    quantity:        yarn.antal         ? parseFloat(yarn.antal) : 1,
    status:          yarn.status        || 'På lager',
    hex_color:       yarn.hex           || null,
    notes:           yarn.noter         || null,
    catalog_yarn_id:   yarn.catalogYarnId   ?? null,
    catalog_color_id:  yarn.catalogColorId  ?? null,
    catalog_image_url: yarn.catalogImageUrl ?? null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromDb(row: Record<string, any>) {
  return {
    id:             row.id,
    name:           row.name,
    brand:          row.brand,
    colorName:      row.color_name,
    colorCode:      row.color_code,
    colorCategory:  row.color_category  ?? null,
    fiber:          row.fiber,
    weight:         row.yarn_weight,
    pindstr:        row.gauge,
    metrage:        row.meters,
    antal:          row.quantity        ?? 1,
    status:         row.status          ?? 'På lager',
    hex:            row.hex_color       ?? '',
    noter:          row.notes           ?? '',
    barcode:        row.barcode,
    imageUrl:       row.image_url       ?? null,
    catalogYarnId:   row.catalog_yarn_id   ?? null,
    catalogColorId:  row.catalog_color_id  ?? null,
    catalogImageUrl: row.catalog_image_url ?? null,
  }
}

// ── yarn_usage ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toUsageDb(u: Record<string, any>) {
  return {
    project_id:        u.projectId      ?? null,
    yarn_item_id:      u.yarnItemId     ?? null,
    yarn_name:         u.yarnName       ?? null,
    yarn_brand:        u.yarnBrand      ?? null,
    color_name:        u.colorName      ?? null,
    color_code:        u.colorCode      ?? null,
    hex_color:         u.hex            ?? null,
    catalog_yarn_id:   u.catalogYarnId  ?? null,
    catalog_color_id:  u.catalogColorId ?? null,
    quantity_used:     u.quantityUsed   ? parseFloat(u.quantityUsed) : null,
    used_for:          u.usedFor        ?? null,
    needle_size:       u.needleSize     ?? null,
    held_with:         u.heldWith       ?? null,
    notes:             u.notes          ?? null,
    project_image_url: u.projectImageUrl ?? null,
    pattern_pdf_url:   u.patternPdfUrl  ?? null,
    used_at:           u.usedAt         ?? new Date().toISOString().slice(0, 10),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromUsageDb(row: Record<string, any>) {
  return {
    id:              row.id,
    projectId:       row.project_id      ?? null,
    yarnItemId:      row.yarn_item_id,
    yarnName:        row.yarn_name,
    yarnBrand:       row.yarn_brand,
    colorName:       row.color_name,
    colorCode:       row.color_code,
    hex:             row.hex_color        ?? '#A8C4C4',
    catalogYarnId:   row.catalog_yarn_id  ?? null,
    catalogColorId:  row.catalog_color_id ?? null,
    quantityUsed:    row.quantity_used,
    usedFor:         row.used_for,
    needleSize:      row.needle_size,
    heldWith:        row.held_with,
    notes:           row.notes,
    projectImageUrl: row.project_image_url,
    patternPdfUrl:   row.pattern_pdf_url,
    usedAt:          row.used_at,
    createdAt:       row.created_at,
  }
}
