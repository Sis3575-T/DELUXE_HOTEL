import mongoose from "mongoose";

const hotelSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    images: { type: [String], default: [] },
    roomType: { type: String, default: 'Standard' },
    capacity: { type: Number, default: 2 },
    // amenities: flexible list admins can edit (icon/title/desc)
    amenities: {
        type: [
            {
                icon: { type: String },
                title: { type: String },
                desc: { type: String },
            },
        ],
        default: [],
    },
    available: { type: Boolean, default: true },
    status: { type: String, enum: ['available', 'occupied', 'reserved', 'maintenance', 'cleaning', 'out-of-service', 'inactive'], default: 'available' },
    date: { type: Number, required: true },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
})
// Virtual occupancy display derived from capacity (e.g. "1-2 persons")
hotelSchema.virtual('occupancy').get(function () {
    const cap = this.capacity || 1
    return cap === 1 ? '1 person' : `1-${cap} persons`
})

hotelSchema.index({ status: 1 })
hotelSchema.index({ name: 1 })
hotelSchema.index({ roomType: 1 })
hotelSchema.index({ price: 1 })

const Hotel = mongoose.models.Hotel || mongoose.model('Hotel', hotelSchema);
export default Hotel;
