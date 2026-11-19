const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"]
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Books",
        "Electronics",
        "Calculators",
        "Cycles",
        "Accessories",
        "Furniture"
      ]
    },
    condition: {
      type: String,
      required: [true, "Condition is required"],
      enum: ["New", "Like New", "Good", "Used"],
      default: "Good"
    },
    location: {
      type: String,
      required: [true, "Campus location is required"],
      trim: true
    },
    seller: {
      type: String,
      required: [true, "Seller name is required"],
      trim: true
    },
    image: {
      type: String,
      default: "images/bookss.jpg",
      trim: true
    },
    status: {
      type: String,
      enum: ["Available", "Sold"],
      default: "Available"
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        return ret;
      }
    }
  }
);

module.exports = mongoose.model("Product", productSchema);