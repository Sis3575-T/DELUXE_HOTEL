import multer from "multer";
const storage =nmulter.diskStorage({
    filename: function(req, file,callback){
        callback(null,file.originalname)
    }
})
const upload = multer(storage)
export default upload