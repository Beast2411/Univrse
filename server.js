
const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const PORT = 3000;

const productsFile = path.join(__dirname, "data", "products.json");

app.use(express.json());
app.use(express.static(__dirname));

// Get all marketplace products
app.get("/api/products", async (req, res) => {
  try {
    const products = JSON.parse(
      await fs.readFile(productsFile, "utf8")
    );

    res.json(products);
} catch (error) {
  console.error("Products error:", error);
  res.status(500).json({ error: "Could not load products" });
}
});

// Add a new marketplace listing
app.post("/api/products", async (req, res) => {
  try {
    const { name, price, category, condition, location, seller, image } = req.body;

    if (
      !name || !category || !condition || !location || !seller ||
      !Number.isFinite(price) || price <= 0
    ) {
      return res.status(400).json({ error: "Invalid product details" });
    }

    const products = JSON.parse(
      await fs.readFile(productsFile, "utf8")
    );

    const newProduct = {
      id: Date.now(),
      name,
      price,
      category,
      condition,
      location,
      seller,
      image: image || "images/bookss.jpg"
    };

    products.push(newProduct);

    await fs.writeFile(
      productsFile,
      JSON.stringify(products, null, 2)
    );

    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ error: "Could not add product" });
  }
});

app.listen(PORT, () => {
  console.log(`Marketplace running at http://localhost:${PORT}`);
});
