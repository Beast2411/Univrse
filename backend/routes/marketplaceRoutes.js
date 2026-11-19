const express = require("express");
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct
} = require("../controllers/marketplaceController");

router.get("/", getAllProducts);
router.get("/:id", getProductById);
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.patch("/:id/status", updateProductStatus);
router.delete("/:id", deleteProduct);

module.exports = router;