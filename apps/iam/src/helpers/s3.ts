import properties from '#properties';
import { DeleteObjectCommand, DeleteObjectCommandInput, PutObjectCommand, PutObjectCommandOutput, S3Client } from '@aws-sdk/client-s3';

type UploadParams = {
    bucket: string;
    key: string;
    body: Buffer;
    contentType?: string;
};

const s3 = new S3Client({
    region: properties.awsRegion,
    credentials: {
        accessKeyId: properties.awsAccessKeyId!,
        secretAccessKey: properties.awsSecretAccessKey!,
    },
});

export async function uploadToS3({
    bucket,
    key,
    body,
    contentType = "application/octet-stream",
}: UploadParams): Promise<PutObjectCommandOutput> {
    return await s3.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentType: contentType,
            ACL: 'public-read',
        })
    );
}

export async function deleteFromS3({
    Bucket,
    Key,
}: DeleteObjectCommandInput): Promise<PutObjectCommandOutput> {
    return await s3.send(
        new DeleteObjectCommand({
            Bucket,
            Key,
        }),
    );
}
