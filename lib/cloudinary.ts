import { Cloudinary } from '@cloudinary/url-gen';
import { upload } from 'cloudinary-react-native';

const CLOUD  = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

export const cld = new Cloudinary({ cloud: { cloudName: CLOUD } });

export type UploadKind = 'reports' | 'cleanups/before' | 'cleanups/after';

export async function uploadPhoto(localUri: string, kind: UploadKind) {
  return new Promise<{ secure_url: string; public_id: string; tags: string[] }>(
    (resolve, reject) => {
      upload(cld, {
        file: localUri,
        options: {
          upload_preset: PRESET,
          folder: `waste2wealth/${kind}`,
          eager: 'e_auto_tagging:80',
          eager_async: true,
        },
        callback: (err: any, response: any) => {
          if (err || !response) return reject(err);
          resolve({
            secure_url: response.secure_url!,
            public_id:  response.public_id!,
            tags:       response.tags ?? [],
          });
        },
      });
    },
  );
}

const baseUrl = (publicId: string, transforms: string) =>
  `https://res.cloudinary.com/${CLOUD}/image/upload/${transforms}/${publicId}.jpg`;

export const buildThumb = (publicId: string) =>
  baseUrl(publicId, 'c_thumb,g_auto,w_400,h_300,f_auto,q_auto');

export const buildComparisonImage = (publicId: string) =>
  baseUrl(publicId, 'c_fill,w_800,h_600,g_auto,f_auto,q_auto');

export const buildHeroImage = (publicId: string) =>
  baseUrl(publicId, 'c_fill,w_1200,h_900,g_auto,f_auto,q_auto:best');
