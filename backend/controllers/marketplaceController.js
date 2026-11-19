const Product = require("../models/Product");

// GET /api/marketplace
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: products
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/marketplace/:id
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: product
    });
  } catch (error) {
    res.status(400).json({ success: false, message: "Invalid product ID" });
  }
};

// POST /api/marketplace
exports.createProduct = async (req, res) => {
  try {
    const { title, description, category, price, sellerName, contact, imageUrl, status } = req.body;
    const product = await Product.create({
      title,
      description,
      category,
      price,
      sellerName,
      contact,
      imageUrl: imageUrl || "",
      status: status || "Available"
    });
    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/marketplace/:id
exports.updateProduct = async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!updated) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updated
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PATCH /api/marketplace/:id/status
exports.updateProductStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Available", "Sold"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'Available' or 'Sold'"
      });
    }
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    res.status(200).json({
      success: true,
      message: `Product marked as ${status}`,
      data: updated
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/marketplace/:id
exports.deleteProduct = async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      data: deleted
    });
  } catch (error) {
    res.status(400).json({ success: false, message: "Invalid product ID" });
  }
};