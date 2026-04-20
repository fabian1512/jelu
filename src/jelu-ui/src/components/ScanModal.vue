<script setup lang="ts">
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { DetectedBarcode, EmittedError, QrcodeStream } from "vue-qrcode-reader";
import useTypography from "../composables/typography";

const { t } = useI18n({
  inheritLocale: true,
  useScope: "global",
});

const emit = defineEmits<{
  (e: "close"): void;
  (e: "decoded", barcode: string | null): void;
  (e: "barcodeLoaded", reader: any): void;
}>();

const decodedText = ref("");
const barcodeReader = ref();
const loading = ref(true);

const selected = ref(null as MediaDeviceInfo | null);
const devices = ref([] as MediaDeviceInfo[]);

const torchActive = ref(false);
const torchNotSupported = ref(false);

const zxingVideo = ref<HTMLVideoElement | null>(null);
const isZxingFallback = ref(false);
let zxingReader: BrowserMultiFormatReader | null = null;
let zxingControls: IScannerControls | null = null;

const scanFormats = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"];

const streamConstraints = computed(() => {
  if (selected.value?.deviceId) {
    return {
      deviceId: { exact: selected.value.deviceId },
    };
  }

  return {
    facingMode: "environment",
  };
});

const zxingConstraints = computed(() => {
  const baseVideo = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    focusMode: "continuous",
  } as MediaTrackConstraints;

  if (selected.value?.deviceId) {
    return {
      audio: false,
      video: {
        ...baseVideo,
        deviceId: { exact: selected.value.deviceId },
      },
    };
  }

  return {
    audio: false,
    video: {
      ...baseVideo,
      facingMode: { ideal: "environment" },
    },
  };
});

const isIosDevice = () => {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && "ontouchend" in document);
};

const shouldUseZxing = () => isIosDevice();

const acceptBarcode = () => {
  emit("decoded", decodedText.value);
  emit("close");
};

const stopZxingScanner = async () => {
  if (zxingControls) {
    zxingControls.stop();
    zxingControls = null;
  }

  if (zxingReader) {
    zxingReader.reset();
    zxingReader = null;
  }
};

const startZxingScanner = async () => {
  if (!isZxingFallback.value || !zxingVideo.value) {
    return;
  }

  await stopZxingScanner();
  loading.value = true;

  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.UPC_A, BarcodeFormat.EAN_8]);
  hints.set(DecodeHintType.TRY_HARDER, true);

  zxingReader = new BrowserMultiFormatReader(hints, {
    delayBetweenScanAttempts: 100,
    delayBetweenScanSuccess: 250,
  });

  try {
    zxingControls = await zxingReader.decodeFromConstraints(zxingConstraints.value, zxingVideo.value, (result, error) => {
      if (result) {
        decodedText.value = result.getText();
        acceptBarcode();
        return;
      }

      if (error && error.name !== "NotFoundException") {
        // non-fatal decode errors are ignored during continuous scanning
      }
    });

    torchNotSupported.value = !(zxingControls && "switchTorch" in zxingControls);
    emit("barcodeLoaded", zxingVideo.value);
  } catch (error) {
    console.error("zxing start error", error);
  } finally {
    loading.value = false;
  }
};

const toggleTorch = async () => {
  if (isZxingFallback.value) {
    if (!zxingControls || !("switchTorch" in zxingControls)) {
      torchNotSupported.value = true;
      return;
    }

    try {
      await (zxingControls as any).switchTorch(!torchActive.value);
      torchActive.value = !torchActive.value;
    } catch {
      torchNotSupported.value = true;
    }
    return;
  }

  torchActive.value = !torchActive.value;
};

const onLoaded = (capabilities: Partial<MediaTrackCapabilities>) => {
  torchNotSupported.value = !(capabilities as any).torch;
  loading.value = false;
  emit("barcodeLoaded", barcodeReader.value);
};

const onDecode = (detectedBarcodes: Array<DetectedBarcode>) => {
  decodedText.value = detectedBarcodes[0].rawValue;
  acceptBarcode();
};

const onError = (_error: EmittedError) => {
  // handled by scanner UI state
};

watch(
  () => selected.value?.deviceId,
  async () => {
    if (isZxingFallback.value) {
      await startZxingScanner();
    }
  }
);

watch(
  () => zxingVideo.value,
  async (videoElement) => {
    if (isZxingFallback.value && videoElement) {
      await startZxingScanner();
    }
  }
);

onMounted(async () => {
  isZxingFallback.value = shouldUseZxing();

  if (isZxingFallback.value) {
    selected.value = null;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    stream.getTracks().forEach((track) => track.stop());
  } catch {
    // scanner error handling will cover missing permission
  }

  devices.value = (await navigator.mediaDevices.enumerateDevices()).filter(({ kind }) => kind === "videoinput");

  if (devices.value.length > 0 && !selected.value) {
    const backCamera = devices.value.find((d) => /back|rear|environment|rueck|hinten/i.test(d.label));
    selected.value = backCamera ?? (isZxingFallback.value ? null : devices.value[0]);
  }

  if (isZxingFallback.value) {
    await startZxingScanner();
  }
});

onBeforeUnmount(async () => {
  await stopZxingScanner();
});

const { typographyClasses } = useTypography();
</script>

<template>
  <section class="edit-modal">
    <div class="grid justify-center justify-items-center">
      <div class="mb-2">
        <h1
          class="text-2xl capitalize"
          :class="typographyClasses"
        >
          {{ t("labels.import_book") }}
        </h1>
      </div>
      <div>
        <div class="field mb-2">
          <p>
            {{ t("labels.pick_camera") }}:
            <select v-model="selected">
              <option
                v-for="device in devices"
                :key="device.label"
                :value="device"
              >
                {{ device.label }}
              </option>
            </select>
          </p>

          <qrcode-stream
            v-if="!isZxingFallback"
            ref="barcodeReader"
            v-memo="[torchActive, selected?.deviceId]"
            :constraints="streamConstraints"
            :torch="torchActive"
            :formats="scanFormats"
            @detect="onDecode"
            @camera-on="onLoaded"
            @error="onError"
          >
            <div
              v-if="loading"
              class="loading-indicator"
            >
              {{ t("labels.loading") }}...
            </div>
          </qrcode-stream>

          <div
            v-else
            class="scanner-wrap"
          >
            <video
              ref="zxingVideo"
              class="scanner-video"
              autoplay
              muted
              playsinline
            />
            <div
              v-if="loading"
              class="loading-indicator"
            >
              {{ t("labels.loading") }}...
            </div>
          </div>

          <button
            :disabled="torchNotSupported"
            @click="toggleTorch"
          >
            <svg
              v-if="torchActive"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="size-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
              />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="size-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M11.412 15.655 9.75 21.75l3.745-4.012M9.257 13.5H3.75l2.659-2.849m2.048-2.194L14.25 2.25 12 10.5h8.25l-4.707 5.043M8.457 8.457 3 3m5.457 5.457 7.086 7.086m0 0L21 21"
              />
            </svg>
          </button>

          <p>{{ decodedText }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.loading-indicator {
  font-weight: bold;
  font-size: 2rem;
  text-align: center;
}

.scanner-wrap {
  position: relative;
  width: min(100%, 420px);
}

.scanner-video {
  width: 100%;
  border-radius: 0.5rem;
}
</style>
