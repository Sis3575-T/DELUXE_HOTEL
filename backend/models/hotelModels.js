import mongoose from "mongoose";

const hotelSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    images: { type: [String], default: [] },
    roomType: { type: String, default: 'Standard' },
    capacity: { type: Number, default: 2 },
    available: { type: Boolean, default: true },
    date: { type: Number, required: true },
})

const Hotel = mongoose.models.Hotel || mongoose.model('Hotel', hotelSchema);
export default Hotel;
