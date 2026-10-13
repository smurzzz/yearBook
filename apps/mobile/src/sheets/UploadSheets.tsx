import React, { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import {
  Camera,
  Check,
  Images,
  RefreshCw,
  Settings,
  UploadCloud,
} from "lucide-react-native";
import { useTheme } from "../theme/useTheme";
import { radius as radii, typography } from "../theme/tokens";
import { Sheet } from "../components/ui/Overlay";
import { Button } from "../components/ui/Button";
import { InlineBanner, Meter, PermissionPrompt, UploadRow } from "../components/ui/Feedback";
import { useMockApp } from "../prototype/store";
import { LIBRARY_PHOTOS, eventById } from "../prototype/data";
import { MAX_BATCH, uploadGuard, uploadSummary } from "../prototype/selectors";

const OptionRow = ({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}) => {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.card,
        padding: 14,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: t.primary + "1F",
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.body, { fontWeight: "700", color: t.foreground }]}>{title}</Text>
        <Text style={[typography.caption, { color: t.mutedForeground, marginTop: 2 }]}>{subtitle}</Text>
      </View>
    </Pressable>
  );
};

export const SourceChooserSheet = ({ open }: { open: boolean }) => {
  const t = useTheme();
  const { close, open: openOverlay } = useMockApp();

  return (
    <Sheet open={open} onClose={close} title="Add photos" description="Choose where the photos come from.">
      <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 10 }}>
        <OptionRow
          icon={<Camera size={20} color={t.primary} />}
          title="Take a photo"
          subtitle="Opens the camera. One photo at a time."
          onPress={() => openOverlay("cameraPermission")}
        />
        <OptionRow
          icon={<Images size={20} color={t.primary} />}
          title="Choose from gallery"
          subtitle={`Select up to ${MAX_BATCH} photos in one batch.`}
          onPress={() => openOverlay("galleryPermission")}
        />
      </View>
    </Sheet>
  );
};

export const CameraPermissionSheet = ({ open }: { open: boolean }) => {
  const { dispatch, close, goto } = useMockApp();

  return (
    <Sheet open={open} onClose={close} hideClose>
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
    </Sheet>
  );
};

export const GalleryPermissionSheet = ({ open }: { open: boolean }) => {
  const { close, open: openOverlay } = useMockApp();
  const [denied, setDenied] = useState(false);

  if (denied) {
    return (
      <Sheet open={open} onClose={close} hideClose>
        <PermissionPrompt
          icon={Settings}
          title="Photo access is off"
          message="You can still take a new photo with the camera. To pick from your gallery, turn on photo access in Settings."
          allowLabel="Open settings"
          denyLabel="Use the camera"
          onDeny={() => openOverlay("cameraPermission")}
          onAllow={() => setDenied(false)}
        />
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={close} hideClose>
      <PermissionPrompt
        icon={Images}
        title="Allow access to your photos?"
        message="We only look at the photos you pick. Nothing is uploaded until you tap Submit."
        allowLabel="Allow access"
        onDeny={() => setDenied(true)}
        onAllow={() => openOverlay("libraryPicker")}
      />
    </Sheet>
  );
};

/** Mock of the OS gallery picker: multi-select grid with a running counter. */
export const LibraryPickerSheet = ({ open }: { open: boolean }) => {
  const t = useTheme();
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
    <Sheet
      open={open}
      onClose={close}
      size="tall"
      title="Recents"
      description={`${LIBRARY_PHOTOS.length} photos · up to ${MAX_BATCH} per batch`}
      footer={
        <Button
          block
          size="lg"
          disabled={selected.length === 0}
          title={`Add ${selected.length || ""} ${selected.length === 1 ? "photo" : "photos"}`.trim()}
          onPress={() => {
            dispatch({ type: "addUploadItems", srcs: selected });
            setSelected([]);
            close();
            goto("upload");
          }}
        />
      }
    >
      <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
          {LIBRARY_PHOTOS.map((src) => {
            const index = selected.indexOf(src);
            const isSelected = index >= 0;
            return (
              <Pressable
                key={src}
                onPress={() => toggle(src)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Select photo ${LIBRARY_PHOTOS.indexOf(src) + 1}`}
                style={{ width: "31.5%", aspectRatio: 1, borderRadius: radii.tile, overflow: "hidden" }}
              >
                <Image
                  source={{ uri: src }}
                  style={{ width: "100%", height: "100%", transform: [{ scale: isSelected ? 0.92 : 1 }] }}
                  resizeMode="cover"
                />
                <View
                  style={{
                    position: "absolute",
                    right: 6,
                    top: 6,
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: isSelected ? t.primary : t.onImage,
                    backgroundColor: isSelected ? t.primary : "rgba(6,6,15,0.35)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isSelected ? (
                    <Text style={[typography.caption, { color: t.primaryForeground, fontWeight: "700" }]}>
                      {index + 1}
                    </Text>
                  ) : (
                    <Check size={14} color="transparent" />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
        <Text
          style={[
            typography.caption,
            { color: t.mutedForeground, marginTop: 12, paddingHorizontal: 8 },
          ]}
        >
          Camera roll from the last 30 days
        </Text>
      </View>
    </Sheet>
  );
};

/** Sheet 8 — Upload Progress. Per-photo rows, retry, and the success state. */
export const UploadProgressSheet = ({ open }: { open: boolean }) => {
  const t = useTheme();
  const { state, dispatch, close, goto } = useMockApp();
  const summary = uploadSummary(state);
  const guard = uploadGuard(state);
  const event = state.upload.eventId ? eventById(state.upload.eventId) : null;
  const succeeded = state.uploadPhase === "success";

  return (
    <Sheet
      open={open}
      onClose={close}
      size={succeeded ? "auto" : "tall"}
      hideClose={succeeded}
      title={succeeded ? undefined : summary.failed ? "Some photos need another try" : "Uploading photos"}
      footer={
        succeeded ? (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button
              variant="outline"
              style={{ flex: 1 }}
              title="Upload more"
              icon={<Images size={17} color={t.foreground} />}
              onPress={() => dispatch({ type: "resetUpload" })}
            />
            <Button
              style={{ flex: 1 }}
              title="View my photos"
              onPress={() => {
                dispatch({ type: "resetUpload" });
                goto("myPhotos");
              }}
            />
          </View>
        ) : summary.failed ? (
          <Button
            block
            title="Retry all failed"
            icon={<RefreshCw size={17} color={t.primaryForeground} />}
            onPress={() => dispatch({ type: "retryFailed" })}
          />
        ) : (
          <Button block variant="outline" title="Continue in the background" onPress={close} />
        )
      }
    >
      {succeeded ? (
        <View style={{ alignItems: "center", paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: t.approved,
            }}
          >
            <Check size={32} color={t.onImage} strokeWidth={3} />
          </View>
          <Text
            style={[typography.title, { fontWeight: "800", color: t.foreground, marginTop: 16, textAlign: "center" }]}
          >
            All photos uploaded
          </Text>
          <Text
            style={[typography.label, { color: t.mutedForeground, marginTop: 6, textAlign: "center" }]}
          >
            {summary.total} photo{summary.total === 1 ? "" : "s"} {summary.total === 1 ? "is" : "are"} with
            the yearbook committee{event ? ` for ${event.name}` : ""}. You will get a notification when they
            are reviewed.
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
            {state.upload.items.slice(0, 4).map((item) => (
              <View key={item.id} style={{ width: 56, height: 56, borderRadius: radii.sm, overflow: "hidden" }}>
                <Image source={{ uri: item.src }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          {state.uploadError === "offline" || state.network === "offline" ? (
            <InlineBanner
              style={{ marginBottom: 16 }}
              tone="warning"
              title="No connection. Your photos are saved and will retry."
              message="Nothing was lost. The queue resumes automatically when you are back online."
              action={{
                label: "Try again",
                onClick: () => {
                  dispatch({ type: "setNetwork", network: "online" });
                  dispatch({ type: "retryFailed" });
                },
              }}
            />
          ) : null}

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: t.primary + "1F",
              }}
            >
              <UploadCloud size={20} color={t.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.label, { fontWeight: "700", color: t.foreground }]}>
                {summary.done} of {summary.total} done
                {summary.failed ? (
                  <Text style={{ color: t.rejectedForeground }}> · {summary.failed} failed</Text>
                ) : null}
              </Text>
              <Text numberOfLines={1} style={[typography.caption, { color: t.mutedForeground, marginTop: 2 }]}>
                {event ? `${event.name} · ${state.upload.category ?? "No category"}` : "Preparing"}
              </Text>
            </View>
            <Text style={[typography.subhead, { fontWeight: "700", color: t.foreground }]}>
              {summary.percent}%
            </Text>
          </View>

          <Meter style={{ marginTop: 12 }} value={summary.percent} />

          <Text
            style={[
              typography.eyebrow,
              { color: t.mutedForeground, textTransform: "uppercase", fontWeight: "700", marginTop: 16 },
            ]}
          >
            Photos
          </Text>
          <View style={{ marginTop: 4 }}>
            {state.upload.items.map((item, index) => (
              <UploadRow key={item.id} item={item} index={index} onRetry={() => dispatch({ type: "retryFailed" })} />
            ))}
          </View>

          <Text style={[typography.caption, { color: t.mutedForeground, marginTop: 12, lineHeight: 17 }]}>
            Keep the app open until this finishes. Photos compress automatically, so uploading{" "}
            {state.upload.items.length} photos uses about {state.upload.items.length * 4} MB of data.
          </Text>

          {!guard.ok ? (
            <InlineBanner
              style={{ marginTop: 16 }}
              tone="warning"
              title={guard.title}
              message={guard.message}
            />
          ) : null}
        </View>
      )}
    </Sheet>
  );
};
