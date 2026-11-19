const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160, index: true },
  description: { type: String, trim: true, default: '', maxlength: 5000 },
  category: { type: String, required: true, trim: true, maxlength: 80, index: true },
  price: { type: Number, required: true, min: 0 },
  sellerName: { type: String, required: true, trim: true, maxlength: 120 },
  contact: { type: String, trim: true, default: '', maxlength: 200 },
  imageUrl: { type: String, trim: true, default: '', maxlength: 2048 },
  status: { type: String, enum: ['Available', 'Sold'], default: 'Available', index: true }
}, { timestamps: true });

productSchema.index({ title: 'text', description: 'text' });
module.exports = mongoose.model('Product', productSchema);
