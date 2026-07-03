/**
 * Upload naar een Supabase signed upload URL met voortgangsrapportage.
 *
 * De supabase-js helper (`uploadToSignedUrl`) gebruikt fetch en kan geen
 * upload-voortgang rapporteren; XHR kan dat wel. De signed URL van
 * `createSignedUploadUrl` bevat het token al als query-parameter.
 *
 * `onProgress` krijgt 0–1, of `null` zolang de totale grootte onbekend is
 * (sommige browsers sturen geen bruikbare progress-events).
 */
export function uploadToSignedUrlWithProgress(
  signedUrl: string,
  blob: Blob,
  contentType: string,
  onProgress: (fraction: number | null) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("content-type", contentType);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.timeout = 120_000;

    onProgress(null);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        onProgress(Math.min(1, e.loaded / e.total));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(1);
        resolve();
      } else {
        reject(new Error(`Upload mislukt (HTTP ${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload mislukt — check je internet"));
    xhr.ontimeout = () => reject(new Error("Upload duurde te lang — probeer opnieuw"));

    xhr.send(blob);
  });
}
