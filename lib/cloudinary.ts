import { Cloudinary } from '@cloudinary/url-gen';

const CLOUD  = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

export const cld = new Cloudinary({ cloud: { cloudName: CLOUD } });

export type UploadKind = 'reports' | 'cleanups/before' | 'cleanups/after';

export async function uploadPhoto(localUri: string, kind: UploadKind) {
  console.log('[cloudinary] uploadPhoto called', { localUri, kind, CLOUD, PRESET });

  if (!CLOUD || !PRESET) {
    throw new Error(`Missing env vars — CLOUD="${CLOUD}" PRESET="${PRESET}"`);
  }

  const formData = new FormData();
  // React Native accepts { uri, type, name } for file fields
  formData.append('file', { uri: localUri, type: 'image/jpeg', name: 'photo.jpg' } as any);
  formData.append('upload_preset', PRESET);
  formData.append('folder', `waste2wealth/${kind}`);

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`;
  console.log('[cloudinary] POST', endpoint);

  const res = await fetch(endpoint, { method: 'POST', body: formData });
  const json = await res.json();

  console.log('[cloudinary] response status', res.status, JSON.stringify(json).slice(0, 300));

  if (!res.ok) {
    throw new Error(json?.error?.message ?? `Upload failed (${res.status})`);
  }

  return {
    secure_url: json.secure_url as string,
    public_id:  json.public_id  as string,
    tags:       (json.tags ?? []) as string[],
  };
}

const baseUrl = (publicId: string, transforms: string) =>
  `https://res.cloudinary.com/${CLOUD}/image/upload/${transforms}/${publicId}.jpg`;

export const buildThumb = (publicId: string) =>
  baseUrl(publicId, 'c_thumb,g_auto,w_400,h_300,f_auto,q_auto');

export const buildComparisonImage = (publicId: string) =>
  baseUrl(publicId, 'c_fill,w_800,h_600,g_auto,f_auto,q_auto');

export const buildHeroImage = (publicId: string) =>
  baseUrl(publicId, 'c_fill,w_1200,h_900,g_auto,f_auto,q_auto:best');

// Cloudinary-composed side-by-side comparison (single URL, one network request).
// Step 1: crop before to 400×450; Step 2: pad canvas to 800×450 (before on left);
// Step 3: overlay after anchored to east half; Step 4: label each half.
export const buildSideBySide = (beforeId: string, afterId: string): string => {
  const afterEncoded = afterId.replace(/\//g, ':');
  return (
    `https://res.cloudinary.com/${CLOUD}/image/upload` +
    `/w_400,h_450,c_fill,g_auto` +
    `/w_800,h_450,c_pad,g_west,b_white` +
    `/l_${afterEncoded},w_400,h_450,c_fill,g_auto,g_east,fl_layer_apply` +
    `/l_text:Roboto_14_bold:BEFORE,co_white,g_north_west,x_12,y_10,fl_layer_apply` +
    `/l_text:Roboto_14_bold:AFTER,co_white,g_north_east,x_12,y_10,fl_layer_apply` +
    `/f_auto,q_auto` +
    `/${beforeId}`
  );
};
