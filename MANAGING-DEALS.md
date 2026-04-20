# Managing "This Week's Deals" (Homepage)

The editorial deals section on the homepage is driven by **WooCommerce product tags**. Swap the products shown there without touching code by changing which products carry which tag.

- **Hero slot (large card, left):** tag `homepage-hero` → use on **one** product at a time.
- **Grid slots (4 small cards, right):** tag `homepage-deal` → use on **4** products.

If no product carries these tags, the section falls back to featured + on-sale + top-selling items so it's never empty.

---

## 3-step guide — swap a product from the dashboard

### 1. Feature a NEW hero product
1. Go to **Products → All Products** in the WP admin.
2. Open the product you want in the big slot.
3. In the right-hand **Product tags** box, add `homepage-hero` and click **Update**.
4. Open the product currently in the hero slot and **remove** the `homepage-hero` tag (so only one product has it at a time).

### 2. Swap one of the 4 grid products
1. Open the new grid product → add the tag `homepage-deal` → **Update**.
2. Open the product you want to remove from the grid → remove `homepage-deal` → **Update**.
3. Keep exactly **4** products tagged `homepage-deal`. If there are fewer, the fallback tops up the grid with top sellers; if more, the extras are ignored.

### 3. Flush the cache so the change goes live
1. In the admin sidebar: **Settings → WP Super Cache → Delete Cache** (tab "Contents").
2. Reload the homepage in a private window.

---

## Editing from the block editor

The homepage is a single page containing a **Shortcode block** with `[editorial_deals]`. If you ever need to re-insert it:

- In the block editor: click **+** → **Patterns** → **Toke Haus** → **Editorial Deals — Homepage**.
- Or add a **Shortcode block** manually and type: `[editorial_deals]`.

### Optional shortcode overrides

| Attribute   | Purpose                                               | Example                                       |
|-------------|-------------------------------------------------------|-----------------------------------------------|
| `hero_id`   | Force a specific product in the hero slot             | `[editorial_deals hero_id="1234"]`            |
| `grid_ids`  | Force specific products in the grid (comma-separated) | `[editorial_deals grid_ids="101,102,103,104"]` |
| `hero_tag`  | Use a different tag for the hero                      | `[editorial_deals hero_tag="spring-hero"]`    |
| `grid_tag`  | Use a different tag for the grid                      | `[editorial_deals grid_tag="spring-deals"]`   |
| `title`     | Override the section heading                          | `[editorial_deals title="Spring Drops"]`      |
| `eyebrow`   | Override the small label above the heading            | `[editorial_deals eyebrow="New this week"]`   |

Attributes can be combined: `[editorial_deals title="Spring Drops" grid_tag="spring-deals"]`.

---

## Quick checklist before publishing a swap

- [ ] Exactly 1 product tagged `homepage-hero`
- [ ] Exactly 4 products tagged `homepage-deal`
- [ ] All 5 products are **In stock** and **Published**
- [ ] Each has a featured image set
- [ ] WP Super Cache purged
