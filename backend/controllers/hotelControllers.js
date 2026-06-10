import hotelModel from "../models/hotelModels.js";
import { v2 as cloudinary } from "cloudinary";

const addHotel = async (req, res) => {
	try {
		const { name, price, description } = req.body;
		const image = req.file;

		if (!image || !image.path) {
			return res.status(400).json({ success: false, message: 'Image is required (form field name: "image")' });
		}

		let imageUrl = "https://via.placeholder.com/150";
		const result = await cloudinary.uploader.upload(image.path, { resource_type: 'image' });
		imageUrl = result?.secure_url || result?.secureUrl || result?.secure_Url || imageUrl;

		const hotelData = {
			name,
			description,
			price: Number(price) || 0,
			image: imageUrl,
			date: Date.now()
		};

		const hotel = new hotelModel(hotelData);
		await hotel.save();
		return res.json({ success: true, message: "Hotel room added successfully", hotel });
	} catch (error) {
		console.error('addHotel error:', error?.message || error);
		return res.status(500).json({ success: false, message: "error Hotel room addition" });
	}
};

const listHotel = async (req, res) => {
	try {
		const hotels = await hotelModel.find({});
		return res.json({ success: true, hotels });
	} catch (error) {
		console.error('listHotel error:', error?.message || error);
		return res.status(500).json({ success: false, message: "error listing hotel room" });
	}
};

const removeHotel = async (req, res) => {
	try {
		const id = req.body.id || req.body._id || req.query.id || req.params.id;
		if (!id) return res.status(400).json({ success: false, message: 'id is required' });
		const deleted = await hotelModel.findByIdAndDelete(id);
		if (!deleted) return res.status(404).json({ success: false, message: 'Hotel not found' });
		return res.json({ success: true, message: 'Hotel room removed successfully', hotel: deleted });
	} catch (error) {
		console.error( error);
		 res.json({ success: false, message: "error deleting hotel room" });
	}
};

const singleHotel = async (req, res) => {
	try {
		const id = req.query.id || req.params.id;
		if (!id) return res.status(400).json({ success: false, message: 'id is required' });
		const hotel = await hotelModel.findById(id);
		if (!hotel) return res.status(404).json({ success: false, message: 'Room not found' });
		return res.json({ hotel });
	} catch (error) {
		console.error('singleHotel error:', error?.message || error);
		return res.status(500).json({ success: false, message: 'error fetching hotel room' });
	}
};

export { addHotel, listHotel, removeHotel, singleHotel };