import { Camera, Check, Images, Settings, X } from "lucide-react";
import { useState } from "react";

import { PhoneButton } from "@/components/app/PhoneButton";
import { PermissionPrompt } from "@/components/app/Feedback";
import { cn } from "@/lib/utils";
import { BottomSheet } from "@/prototype/overlays/BottomSheet";
import { LIBRARY_PHOTOS } from "@/prototype/data";
import { MAX_BATCH } from "@/prototype/selectors";
import { useMockApp } from "@/prototype/store";

/* =========================================================================
   System overlays. These are the OS-level surfaces a native app would show —
   the picker, and the camera / gallery permission prompts. They are states,
   not extra product screens.
   ========================================================================= */

export const SourceChooserSheet = ({ open }: { open: boolean }) => {
  const { close, open: openOverlay } = useMockApp();

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title="Add photos"
      description="Choose where the photos come from."
    >
      <div className="px-5 pb-3">
        <button
          type="button"
          onClick={() => openOverlay("cameraPermission")}
          className="flex w-full items-center gap-3.5 rounded-2xl border border-border bg-card p-3.5 text-left shadow-tile"
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-primary/12 text-primary">
            <Camera className="size-5" aria-hidden="true" />
          </span>
          <span className="flex-1">
            <span className="block text-body font-bold text-foreground">Take a photo</span>
            <span className="mt-0.5 block text-caption text-muted-foreground">
              Opens the camera. One photo at a time.
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => openOverlay("galleryPermission")}
          className="mt-2.5 flex w-full items-center gap-3.5 rounded-2xl border border-border bg-card p-3.5 text-left shadow-tile"
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-primary/12 text-primary">
            <Images className="size-5" aria-hidden="true" />
          </span>
          <span className="flex-1">
            <span className="block text-body font-bold text-foreground">Choose from gallery</span>
            <span className="mt-0.5 block text-caption text-muted-foreground">
              Select up to {MAX_BATCH} photos in one batch.
            </span>
          </span>
        </button>
      </div>
    </BottomSheet>
  );
};

export const CameraPermissionSheet = ({ open }: { open: boolean }) => {
  const { dispatch, close, goto } = useMockApp();

  return (
    <BottomSheet open={open} onClose={close} hideClose>
      <PermissionPrompt
        icon={Camera}
        title="Allow YearbookHub to use the camera?"
        message="Photos you take here go straight into the batch you are submitting. The app never keeps a copy on your phone."
        allowLabel="Allow camera"
        onDeny={close}
        onAllow={() => {
          dispatch({ type: "addUploadItems", srcs: [LIBRARY_PHOTOS[4]] });
          close();
          goto("upload");
        }}
      />
    </BottomSheet>
  );
};

export const GalleryPermissionSheet = ({ open }: { open: boolean }) => {
  const { close, open: openOverlay } = useMockApp();
  const [denied, setDenied] = useState(false);

  if (denied) {
    return (
      <BottomSheet open={open} onClose={close} hideClose>
        <PermissionPrompt
          icon={Settings}
          title="Photo access is off"
          message="You can still take a new photo with the camera. To pick from your gallery, turn on photo access in Settings."
          allowLabel="Open settings"
          denyLabel="Use the camera"
          onDeny={() => openOverlay("cameraPermission")}
          onAllow={() => setDenied(false)}
        />
      </BottomSheet>
    );
  }

  return (
    <BottomSheet open={open} onClose={close} hideClose>
      <PermissionPrompt
        icon={Images}
        title="Allow access to your photos?"
        message="We only look at the photos you pick. Nothing is uploaded until you tap Submit."
        allowLabel="Allow access"
        onDeny={() => setDenied(true)}
        onAllow={() => openOverlay("libraryPicker")}
      />
    </BottomSheet>
  );
};

/** Mock of the OS gallery picker: multi-select grid with a running counter. */
export const LibraryPickerSheet = ({ open }: { open: boolean }) => {
  const { dispatch, close, goto } = useMockApp();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (src: string) => {
    setSelected((current) =>
      current.includes(src)
        ? current.filter((s) => s !== src)
        : current.length >= MAX_BATCH
          ? current
          : [...current, src],
    );
  };

  return (
    <BottomSheet
      open={open}
      onClose={close}
      size="tall"
      title="Recents"
      description={`${LIBRARY_PHOTOS.length} photos · up to ${MAX_BATCH} per batch`}
      footer={
        <PhoneButton
          block
          size="lg"
          disabled={selected.length === 0}
          onClick={() => {
            dispatch({ type: "addUploadItems", srcs: selected });
            setSelected([]);
            close();
            goto("upload");
          }}
        >
          Add {selected.length || ""} {selected.length === 1 ? "photo" : "photos"}
        </PhoneButton>
      }
    >
      <div className="px-3 pb-3">
        <div className="grid grid-cols-3 gap-1">
          {LIBRARY_PHOTOS.map((src) => {
            const index = selected.indexOf(src);
            const isSelected = index >= 0;
            return (
              <button
                key={src}
                type="button"
                onClick={() => toggle(src)}
                aria-pressed={isSelected}
                aria-label={`Select photo ${LIBRARY_PHOTOS.indexOf(src) + 1}`}
                className="group relative aspect-square overflow-hidden rounded-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <img
                  src={src}
                  alt=""
                  crossOrigin="anonymous"
                  loading="lazy"
                  className={cn(
                    "size-full object-cover transition-transform duration-300",
                    isSelected && "scale-[0.92] rounded-tile",
                  )}
                />
                <span
                  className={cn(
                    "absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-onimage bg-canvas/35 text-transparent backdrop-blur-sm",
                  )}
                >
                  {isSelected ? index + 1 : <Check className="size-3.5 opacity-0" aria-hidden="true" />}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 flex items-center gap-2 px-2 text-caption text-muted-foreground">
          <X className="size-3.5" aria-hidden="true" />
          Camera roll from the last 30 days
        </p>
      </div>
    </BottomSheet>
  );
};
