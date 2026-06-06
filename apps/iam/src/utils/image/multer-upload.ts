import multer from "multer";

// Multer config (memory, not disk)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB max upload
    },
    fileFilter(req, file, cb) {
        if (!file.mimetype.startsWith("image/")) {
        return cb(new Error("Only images are allowed"));
        }
        cb(null, true);
    }
});

export default upload;
