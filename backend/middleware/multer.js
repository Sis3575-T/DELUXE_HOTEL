import multer from "multer";
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(process.cwd(), 'uploads')
try { fs.mkdirSync(uploadDir, { recursive: true }) } catch (e) {}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
})

const upload = multer({ storage })
export default upload