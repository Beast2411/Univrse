const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const productsFile = path.join(__dirname, "data", "products.json");

const CATEGORIES = new Set([
  "Books", "Electronics", "Calculators", "Cycles", "Accessories", "Furniture"
]);
const CONDITIONS = new Set(["New", "Like New", "Good", "Used"]);

app.use(express.json({ limit: "20kb" }));
app.use(express.static(__dirname));

async function readProducts() {
  const parsed = JSON.parse(await fs.readFile(productsFile, "utf8"));
  if (!Array.isArray(parsed)) throw new Error("Products data must be an array");
  return parsed;
}

async function writeProducts(products) {
  const tempFile = `${productsFile}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(products, null, 2) + "\n", "utf8");
  await fs.rename(tempFile, productsFile);
}

function validateProduct(body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const condition = typeof body.condition === "string" ? body.condition.trim() : "";
  const location = typeof body.location === "string" ? body.location.trim() : "";
  const seller = typeof body.seller === "string" ? body.seller.trim() : "";
  const price = Number(body.price);

  if (!name || name.length > 80) return "Product name is required (maximum 80 characters)";
  if (!Number.isFinite(price) || price <= 0 || price > 10000000) return "Price must be between ₹1 and ₹1,00,00,000";
  if (!CATEGORIES.has(category)) return "Choose a valid category";
  if (!CONDITIONS.has(condition)) return "Choose a valid condition";
  if (!location || location.length > 100) return "Pickup location is required (maximum 100 characters)";
  if (!seller || seller.length > 80) return "Seller name is required (maximum 80 characters)";

  return { name, price, category, condition, location, seller };
}

app.get("/api/products", async (_req, res) => {
  try {
    res.json(await readProducts());
  } catch (error) {
    console.error("Products read error:", error);
    res.status(500).json({ error: "Could not load products. Check data/products.json." });
  }
});

app.post("/api/products", async (req, res) => {
  const validated = validateProduct(req.body || {});
  if (typeof validated === "string") return res.status(400).json({ error: validated });

  try {
    const products = await readProducts();
    const product = {
      id: Date.now(),
      ...validated,
      image: "images/bookss.jpg"
    };
    products.push(product);
    await writeProducts(products);
    res.status(201).json(product);
  } catch (error) {
    console.error("Product create error:", error);
    res.status(500).json({ error: "Could not save listing. Please try again." });
  }
});

app.put("/api/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id)) return res.status(400).json({ error: "Invalid product ID" });
  const validated = validateProduct(req.body || {});
  if (typeof validated === "string") return res.status(400).json({ error: validated });

  try {
    const products = await readProducts();
    const index = products.findIndex(product => product.id === id);
    if (index === -1) return res.status(404).json({ error: "Listing not found" });
    products[index] = { ...products[index], ...validated };
    await writeProducts(products);
    res.json(products[index]);
  } catch (error) {
    console.error("Product update error:", error);
    res.status(500).json({ error: "Could not update listing. Please try again." });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id)) return res.status(400).json({ error: "Invalid product ID" });

  try {
    const products = await readProducts();
    const remaining = products.filter(product => product.id !== id);
    if (remaining.length === products.length) return res.status(404).json({ error: "Listing not found" });
    await writeProducts(remaining);
    res.status(204).end();
  } catch (error) {
    console.error("Product delete error:", error);
    res.status(500).json({ error: "Could not delete listing. Please try again." });
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ error: "Request body must contain valid JSON" });
  }
  console.error("Unexpected server error:", error);
  res.status(500).json({ error: "Unexpected server error" });
});

app.listen(PORT, () => {
  console.log(`Marketplace running at http://localhost:${PORT}`);
});
