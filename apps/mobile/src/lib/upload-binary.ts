/* Signed binary upload — features/photo-upload.md, api.md §3.

   The API never sees the photo bytes: it hands out a short-lived signed URL
   per file (POST /photos/upload-intents) and the app PUTs the bytes straight
   to storage. The token travels in the query string and as a bearer header —
   both are required by the current Storage API.

   Native builds upload through the filesystem module (raw body, real
   progress). The web build has no filesystem, so it sends the blob through
   XMLHttpRequest, which also reports upload progress. */

export interface SignedUploadTarget {
  path: string;
  upload_url: string;
  token: string;
}

export interface PutFileParams {
  target: SignedUploadTarget;
  /** Local file URI of the bytes to send. */
  uri: string;
  mimeType?: string;
  /** 0…1 while the bytes are on the wire. */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

const isWeb = (): boolean => typeof document !== "undefined";

/** The signed URL with the token attached (query string, as the API's
 *  own live gate does it). */
export const signedUrl = (target: SignedUploadTarget): string =>
  `${target.upload_url}${target.upload_url.includes("?") ? "&" : "?"}token=${encodeURIComponent(target.token)}`;

const putOnWeb = async ({
  target,
  uri,
  mimeType,
  onProgress,
  signal,
}: PutFileParams): Promise<void> => {
  const response = await fetch(uri);
  const blob = await response.blob();

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const done = () => {
      xhr.onload = null;
      xhr.onerror = null;
      xhr.onabort = null;
    };
    xhr.open("PUT", signedUrl(target));
    xhr.setRequestHeader("content-type", mimeType ?? "image/jpeg");
    xhr.setRequestHeader("authorization", `Bearer ${target.token}`);
    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total);
      };
    }
    xhr.onload = () => {
      done();
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`upload failed: ${xhr.status}`));
    };
    xhr.onerror = () => {
      done();
      reject(new Error("upload failed: network error"));
    };
    xhr.onabort = () => {
      done();
      reject(new Error("upload aborted"));
    };
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(blob);
  });
};

const putOnNative = async ({
  target,
  uri,
  mimeType,
  onProgress,
  signal,
}: PutFileParams): Promise<void> => {
  const { File, UploadType } = await import("expo-file-system");
  const file = new File(uri);
  const result = await file.upload(signedUrl(target), {
    httpMethod: "PUT",
    uploadType: UploadType.BINARY_CONTENT,
    mimeType: mimeType ?? "image/jpeg",
    headers: {
      "content-type": mimeType ?? "image/jpeg",
      authorization: `Bearer ${target.token}`,
    },
    signal,
    onProgress: ({ bytesSent, totalBytes }) => {
      if (totalBytes > 0) onProgress?.(bytesSent / totalBytes);
    },
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`upload failed: ${result.status}`);
  }
};

/** PUT one prepared file to its signed storage URL. Throws on any non-2xx
 *  answer or a broken connection — the caller turns that into a failed row
 *  the student can retry. */
export const putSignedFile = async (params: PutFileParams): Promise<void> =>
  isWeb() ? putOnWeb(params) : putOnNative(params);
