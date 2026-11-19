const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Product title is required"],
      trim: true
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Books and Notes",
        "Electronics",
        "Furniture",
        "Sports",
        "Accessories",
        "Other"
      ]
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"]
    },
    sellerName: {
      type: String,
      required: [true, "Seller name is required"],
      trim: true
    },
    contact: {
      type: String,
      required: [true, "Seller contact is required"],
      trim: true
    },
    imageUrl: {
      type: String,
      default: "",
      trim: true
    },
    status: {
      type: String,
      enum: ["Available", "Sold"],
      default: "Available"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);