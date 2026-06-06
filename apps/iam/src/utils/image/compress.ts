import sharp from "sharp";

export async function compressToTargetSize(
    buffer: Buffer,
    maxSizeKB = 200
): Promise<Buffer> {
    let quality = 80;
    let output: Buffer = buffer;

    while (quality >= 40) {
        output = await sharp(buffer)
        .rotate()
        .resize({ width: 512, fit: "inside" })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();

        if (output.length / 1024 <= maxSizeKB) break;
        quality -= 10;
    }

    return output;
}
