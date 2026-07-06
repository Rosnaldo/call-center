import multer from 'multer';

// Multer config (memory, not disk) — chat attachments accept any file type,
// unlike the image-only avatar upload.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB max upload
    },
});

export default upload;
