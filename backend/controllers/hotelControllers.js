import hotelModel from "../models/hotelModels.js";
import Reservation from '../models/reservationModels.js'
import { v2 as cloudinary } from "cloudinary";

const uploadImages = async (files) => {
	const urls = [];
	for (const file of files) {
		if (!file?.path) continue;
		const result = await cloudinary.uploader.upload(file.path, { resource_type: 'image' });
		const url = result?.secure_url || result?.secureUrl;
		if (url) urls.push(url);
	}
	return urls;
};

const addHotel = async (req, res) => {
	try {
		const { name, price, description, roomType, capacity, available } = req.body;
		const files = req.files?.length ? req.files : (req.file ? [req.file] : []);

		if (!files.length) {
			return res.status(400).json({ success: false, message: 'At least one image is required (form field name: "images")' });
		}

		const uploaded = await uploadImages(files);
		if (!uploaded.length) {
			return res.status(400).json({ success: false, message: 'Failed to upload images' });
		}

		const hotelData = {
			name,
			description,
			price: Number(price) || 0,
			image: uploaded[0],
			images: uploaded,
			roomType: roomType || 'Standard',
			capacity: Number(capacity) || 2,
			available: available === 'true' || available === true,
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

const editHotel = async (req, res) => {
	try {
		const { id, name, price, description, roomType, capacity, available } = req.body;
		if (!id) return res.status(400).json({ success: false, message: 'Room id is required' });

		const updateData = {};
		if (name) updateData.name = name;
		if (description) updateData.description = description;
		if (price) updateData.price = Number(price);
		if (roomType) updateData.roomType = roomType;
		if (capacity) updateData.capacity = Number(capacity);
		if (available !== undefined) updateData.available = available === 'true' || available === true;

		const files = req.files?.length ? req.files : (req.file ? [req.file] : []);
		if (files.length) {
			const uploaded = await uploadImages(files);
			if (uploaded.length) {
				updateData.image = uploaded[0];
				updateData.images = uploaded;
			}
		}

		const updated = await hotelModel.findByIdAndUpdate(id, updateData, { new: true });
		if (!updated) return res.status(404).json({ success: false, message: 'Room not found' });
		return res.json({ success: true, message: 'Room updated successfully', hotel: updated });
	} catch (error) {
		console.error('editHotel error:', error?.message || error);
		return res.status(500).json({ success: false, message: 'error updating hotel room' });
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
		console.error(error);
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

const getAvailableRooms = async (req, res) => {
  try {
    const { checkin, checkout } = req.query
    if (!checkin || !checkout) {
      return res.status(400).json({ success: false, message: 'Check-in and check-out dates are required' })
    }
    const allRooms = await hotelModel.find({})
    const overlappingReservations = await Reservation.find({
      status: { $in: ['Pending', 'Approved', 'Checked In'] },
      checkin: { $lt: checkout },
      checkout: { $gt: checkin },
    })
    const reservedRoomIds = new Set(overlappingReservations.map(r => r.roomId))
    const availableRooms = allRooms.filter(r => !reservedRoomIds.has(r._id.toString()))
    return res.json({ success: true, rooms: availableRooms })
  } catch (error) {
    console.error('getAvailableRooms error:', error?.message || error)
    return res.status(500).json({ success: false, message: 'Error fetching available rooms' })
  }
}

export { addHotel, listHotel, editHotel, removeHotel, singleHotel, getAvailableRooms };
