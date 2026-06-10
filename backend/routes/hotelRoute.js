import express from 'express'
import multer from 'multer'
import {addHotel, listHotel, removeHotel, singleHotel} from '../controllers/hotelControllers.js'

const upload = multer({ dest: 'uploads/' })
const hotelRouter = express.Router()
hotelRouter.post('/add' , upload.single('image'), addHotel)
hotelRouter.get('/list' , listHotel)
hotelRouter.post('/remove' , removeHotel)
hotelRouter.get('/rooms/:id' , singleHotel)


hotelRouter.get('/test', (req, res) => res.json({ ok: true, msg: 'route test ok' }))


export default hotelRouter